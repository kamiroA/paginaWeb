import { Component, OnInit, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CommonModule } from '@angular/common';
import {
  Firestore,
  collection,
  collectionData,
  doc as firestoreDoc,
  docData
} from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { Auth, authState } from '@angular/fire/auth';
import { DomSanitizer } from '@angular/platform-browser';
import { UpdateEventDialogComponent } from '../update-event-dialog/update-event-dialog.component';

interface Badge {
  type: 'host' | 'booked' | 'etiqueta';
  label: string;
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css']
})
export class CalendarioComponent implements OnInit, OnDestroy {
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  // Utilizaremos el nombre del usuario para comparar, eliminando el UID.
  currentUserName: string = '';

  // Opciones de FullCalendar  
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    height: 800,
    aspectRatio: 1.8,
    plugins: [dayGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,dayGridDay'
    },
    // Se genera el contenido del evento a partir de sus badges.
    eventContent: (arg) => {
      const badges: Badge[] = arg.event.extendedProps['badges'] || [];
      const badgesHtml = badges
        .map(badge => {
          let className = 'event-badge';
          if (badge.type === 'host') {
            className += ' host-badge';
          } else if (badge.type === 'booked') {
            className += ' booked-badge';
          } else if (badge.type === 'etiqueta') {
            className += ' etiqueta-badge';
          }
          // Se reduce el border-radius de 10px a 5px.
          return `<span class="${className}" style="border-radius: 5px;">${badge.label}</span>`;
        })
        .join(' ');
      const container = document.createElement('div');
      container.className = 'fc-event-custom';
      // Se recomienda actualizar el color de las letras en la hoja CSS a un tono claro (ej. #FFFFFF).
      container.innerHTML = `
        <div class="fc-event-badges">${badgesHtml}</div>
        <div class="fc-event-title">${arg.event.title}</div>
      `;
      return { domNodes: [container] };
    },
    eventDidMount: (info) => {
      // Unificamos los colores de los badges utilizando la paleta establecida.
      const badgeElements = info.el.querySelectorAll('.event-badge') as NodeListOf<HTMLElement>;
      badgeElements.forEach((badge) => {
        if (badge.classList.contains('host-badge')) {
          badge.style.backgroundColor = "#2563eb"; // mainBlue
        } else if (badge.classList.contains('booked-badge')) {
          badge.style.backgroundColor = "#DF85AFFD"; // sec_blue
        } else if (badge.classList.contains('etiqueta-badge')) {
          badge.style.backgroundColor = "#5CC230"; // bar_colorTest2
        }
      });
    },
    eventClick: this.handleEventClick.bind(this),
    editable: true,
    events: [] // Se asignarán posteriormente.
  };

  yourEvents: any[] = [];
  bookedEvents: any[] = [];
  selectedDate: Date | null = null;
  currentMonth: string = '';

  private refreshIntervalId: any;

  constructor(
    private firestore: Firestore,
    private dialog: MatDialog,
    private auth: Auth,
    private sanitizer: DomSanitizer,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    authState(this.auth).subscribe(user => {
      this.ngZone.run(() => {
        if (user) {
          // Se utiliza el displayName o, en su defecto, un valor por defecto.
          this.currentUserName = user.displayName || 'Usuario';
          const userDocRef = firestoreDoc(this.firestore, 'usuarios', user.uid);
          docData(userDocRef, { idField: 'id' }).subscribe((data: any) => {
            this.ngZone.run(() => {
              // Se actualiza currentUserName con el nombre almacenado en el documento de usuario.
              this.currentUserName = data?.name || this.currentUserName;
              const today = new Date();
              this.currentMonth = this.formatMonth(today);
              this.fetchEvents();
            });
          });
        } else {
          console.error('No hay usuario logueado');
        }
      });
    });
    // Recargar eventos cada 2 minutos (120000 ms)
    this.refreshIntervalId = setInterval(() => {
      this.fetchEvents();
    }, 120000);
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
  }

  fetchEvents(): void {
    const eventosRef = collection(this.firestore, 'eventos');
    collectionData(eventosRef, { idField: 'id' }).subscribe((events: any[]) => {
      this.ngZone.run(() => {
        events.forEach(e => {
          if (e.horaInicio && typeof e.horaInicio === 'object' && e.horaInicio.seconds) {
            e.horaInicio = new Date(e.horaInicio.seconds * 1000);
          }
          if (e.horaFin && typeof e.horaFin === 'object' && e.horaFin.seconds) {
            e.horaFin = new Date(e.horaFin.seconds * 1000);
          }

          // Se asignan las badges usando el nombre para establecer si es Organizador o Booked.
          const badges: Badge[] = [];
          if (e.creadorId && e.creadorId.trim().toLowerCase() === this.currentUserName.trim().toLowerCase()) {
            badges.push({ type: 'host', label: 'Organizador' });
          } else if (this.hasUserReservation(e)) {
            badges.push({ type: 'booked', label: 'Booked' });
          }
          if (e.etiqueta) {
            badges.push({ type: 'etiqueta', label: e.etiqueta });
          }
          e.badges = badges;
        });

        // Filtrar eventos creados por el usuario (usando nombre) en "Your Events"
        this.yourEvents = events.filter(e =>
          e.creadorId && e.creadorId.trim().toLowerCase() === this.currentUserName.trim().toLowerCase()
        );
        // Filtrar eventos reservados: aquellos en los que el creador no coincide y se detecta la reserva.
        this.bookedEvents = events.filter(e =>
          e.creadorId &&
          e.creadorId.trim().toLowerCase() !== this.currentUserName.trim().toLowerCase() &&
          this.hasUserReservation(e)
        );

        // Se unifican los colores de las etiquetas con la paleta establecida.
        const etiquetaColors: { [key: string]: string } = {
          profesional: '#2563eb',  // mainBlue
          ocio: '#5CC230',         // bar_colorTest2
          personal: '#FF000000',    // black
          academico: '#DF85AFFD'     // sec_blue
        };

        const calendarEvents: EventInput[] = events
          .filter(e =>
            (e.creadorId && e.creadorId.trim().toLowerCase() === this.currentUserName.trim().toLowerCase()) ||
            this.hasUserReservation(e)
          )
          .map(e => {
            const etiquetaKey: string = e.etiqueta ? e.etiqueta.toLowerCase() : '';
            const etiquetaColor = etiquetaColors[etiquetaKey] || '#757575';
            return {
              id: e.id,
              title: e.codigo || e.title,
              start: e.horaInicio,
              backgroundColor: etiquetaColor,
              borderColor: etiquetaColor,
              extendedProps: {
                description: e.descripcion,
                // Se define el rol en función de la comparación del nombre.
                role: e.creadorId && e.creadorId.trim().toLowerCase() === this.currentUserName.trim().toLowerCase()
                  ? 'Organizador'
                  : 'Booked',
                citasReservadas: e.citasReservadas,
                etiqueta: e.etiqueta,
                reserva: e.citasReservadas,
                etiquetaColor: etiquetaColor,
                creadorId: e.creadorId,
                badges: e.badges
              }
            };
          });

        // Asignar nueva referencia del arreglo para forzar el re-render.
        this.calendarOptions.events = [...calendarEvents];

        // Forzar actualización completa del calendario.
        if (this.calendarComponent) {
          const calendarApi = this.calendarComponent.getApi();
          calendarApi.removeAllEvents();
          calendarApi.addEventSource([...calendarEvents]);
        }
      });
    }, err => {
      console.error('Error al obtener eventos:', err);
    });
  }

  formatMonth(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    return new Intl.DateTimeFormat('es-ES', options).format(date);
  }

  /**
   * Función que comprueba la reserva utilizando el nombre del usuario.
   */
  hasUserReservation(event: any): boolean {
    if (!event.citasReservadas) return false;
    const currentName = this.currentUserName?.trim().toLowerCase();
    for (const key in event.citasReservadas) {
      const reservation = event.citasReservadas[key]?.toString().trim().toLowerCase();
      console.log(`Comparando reserva: ${reservation} con ${currentName}`);
      if (reservation === currentName) {
        return true;
      }
    }
    return false;
  }

  handleEventClick(info: any): void {
    const event = info.event;
    if (event.extendedProps['role'] === 'Organizador') {
      this.editEvent(event);
    } else {
      this.viewEvent(event);
    }
  }

  viewEvent(event: any): void {
    const modalRef = this.dialog.open(UpdateEventDialogComponent, {
      data: { ...event.extendedProps, id: event.id, title: event.title, readOnly: true },
      width: '850px'
    });
    modalRef.afterClosed().subscribe(() => {
      this.fetchEvents();
    });
  }

  editEvent(event: any): void {
    const creatorId = event.extendedProps ? event.extendedProps.creadorId : event.creadorId;
    // Comparación usando el nombre.
    if (!creatorId || creatorId.trim().toLowerCase() !== this.currentUserName.trim().toLowerCase()) {
      console.error('No se permite editar este evento. El creador no coincide.');
      this.viewEvent(event);
      return;
    }
    const eventId = event.id;
    if (!eventId) {
      console.error('No se encontró el ID del evento:', event);
      return;
    }
    const modalRef = this.dialog.open(UpdateEventDialogComponent, {
      data: { id: eventId, readOnly: false },
      width: '850px'
    });
    modalRef.afterClosed().subscribe(() => {
      this.fetchEvents();
    });
  }

  goToPreviousMonth(): void {
    const baseDate = this.selectedDate ? new Date(this.selectedDate) : new Date();
    baseDate.setMonth(baseDate.getMonth() - 1);
    this.currentMonth = this.formatMonth(baseDate);
  }

  goToNextMonth(): void {
    const baseDate = this.selectedDate ? new Date(this.selectedDate) : new Date();
    baseDate.setMonth(baseDate.getMonth() + 1);
    this.currentMonth = this.formatMonth(baseDate);
  }

  getEtiquetaColor(etiqueta: string): string {
    const etiquetaColors: { [key: string]: string } = {
      profesional: '#2563eb',  // mainBlue
      ocio: '#5CC230',         // bar_colorTest2
      personal: '#FF000000',    // black
      academico: '#DF85AFFD'     // sec_blue
    };
    return etiqueta ? etiquetaColors[etiqueta.toLowerCase()] || '#757575' : '#757575';
  }
}

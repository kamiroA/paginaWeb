import { Component, OnInit, NgZone } from '@angular/core';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CommonModule } from '@angular/common';
import {
  Firestore,
  collection,
  collectionData,
  doc as firestoreDoc,
  docData,
  updateDoc,
  deleteDoc,
  doc
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
export class CalendarioComponent implements OnInit {
  currentUserId: string = '';
  currentUserName: string = '';

  // Opciones de FullCalendar. Usamos eventContent con domNodes para crear el contenido usando nuestros nodos DOM.
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
    // Genera el contenido del evento a partir del array de badges
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
          return `<span class="${className}" style="border-radius: 10px;">${badge.label}</span>`;
        })
        .join(' ');
      const container = document.createElement('div');
      container.className = 'fc-event-custom';
      container.innerHTML = `
        <div class="fc-event-badges">${badgesHtml}</div>
        <div class="fc-event-title">${arg.event.title}</div>
      `;
      return { domNodes: [container] };
    },
    // Con eventDidMount forzamos que cada badge tenga su color aplicado inline
    eventDidMount: (info) => {
      const badgeElements = info.el.querySelectorAll('.event-badge') as NodeListOf<HTMLElement>;
      badgeElements.forEach((badge) => {
        if (badge.classList.contains('host-badge')) {
          badge.style.backgroundColor = "#1976d2"; // Azul
        } else if (badge.classList.contains('booked-badge')) {
          badge.style.backgroundColor = "#FF9800"; // Naranja
        } else if (badge.classList.contains('etiqueta-badge')) {
          badge.style.backgroundColor = "#4CAF50"; // Verde
        }
      });
    },
    eventClick: this.handleEventClick.bind(this),
    editable: true,
    events: [] // Aquí se asignan los eventos posteriormente
  };

  yourEvents: any[] = [];
  bookedEvents: any[] = [];
  selectedDate: Date | null = null;
  currentMonth: string = '';

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
          this.currentUserId = user.uid;
          const userDocRef = firestoreDoc(this.firestore, 'usuarios', user.uid);
          docData(userDocRef, { idField: 'id' }).subscribe((data: any) => {
            this.ngZone.run(() => {
              this.currentUserName = data?.name || user.displayName || 'Usuario';
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
  }

  fetchEvents(): void {
    const eventosRef = collection(this.firestore, 'eventos');
    collectionData(eventosRef, { idField: 'id' }).subscribe((events: any[]) => {
      this.ngZone.run(() => {
        // Convertir posibles Timestamps a Date y generar badges
        events.forEach(e => {
          if (e.horaInicio && typeof e.horaInicio === 'object' && e.horaInicio.seconds) {
            e.horaInicio = new Date(e.horaInicio.seconds * 1000);
          }
          if (e.horaFin && typeof e.horaFin === 'object' && e.horaFin.seconds) {
            e.horaFin = new Date(e.horaFin.seconds * 1000);
          }
          const badges: Badge[] = [];
          if (e.creadorId === this.currentUserName) {
            badges.push({ type: 'host', label: 'Host' });
          } else {
            badges.push({ type: 'booked', label: 'Booked' });
          }
          if (e.etiqueta) {
            badges.push({ type: 'etiqueta', label: e.etiqueta });
          }
          e.badges = badges;
        });

        // Filtrar para listas inferiores y para el calendario
        this.yourEvents = events.filter(e => e.creadorId === this.currentUserName);
        this.bookedEvents = events.filter(e => e.creadorId !== this.currentUserName && this.hasUserReservation(e));

        const etiquetaColors: { [key: string]: string } = {
          profesional: '#FF5722',
          ocio: '#4CAF50',
          personal: '#9C27B0',
          academico: '#03A9F4'
        };

        const calendarEvents: EventInput[] = events
          .filter(e =>
            e.creadorId === this.currentUserName || this.hasUserReservation(e)
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
                role: e.creadorId === this.currentUserName ? 'Host' : 'Booked',
                citasReservadas: e.citasReservadas,
                etiqueta: e.etiqueta,
                reserva: e.citasReservadas,
                etiquetaColor: etiquetaColor,
                creadorId: e.creadorId,
                badges: e.badges
              }
            };
          });

        this.calendarOptions.events = calendarEvents;
      });
    }, err => {
      console.error('Error al obtener eventos:', err);
    });
  }

  formatMonth(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    return new Intl.DateTimeFormat('es-ES', options).format(date);
  }

  hasUserReservation(event: any): boolean {
    if (!event.citasReservadas) return false;
    for (const key in event.citasReservadas) {
      if (event.citasReservadas[key] === this.currentUserName) {
        return true;
      }
    }
    return false;
  }

  handleEventClick(info: any): void {
    const event = info.event;
    if (event.extendedProps['role'] === 'Host') {
      this.editEvent(event);
    } else {
      this.viewEvent(event);
    }
  }

  viewEvent(event: any): void {
    this.dialog.open(UpdateEventDialogComponent, {
      data: { ...event.extendedProps, id: event.id, title: event.title, readOnly: true },
      width: '700px'
    });
  }

  editEvent(event: any): void {
    if (
      !event.extendedProps ||
      event.extendedProps.creadorId === undefined ||
      event.extendedProps['creadorId'] !== this.currentUserName
    ) {
      console.error('No se permite editar este evento o la propiedad "creadorId" no existe.');
      this.viewEvent(event);
      return;
    }

    const eventId = event.id;
    if (!eventId) {
      console.error('No se encontró el ID del evento:', event);
      return;
    }

    this.dialog.open(UpdateEventDialogComponent, {
      data: { id: eventId, readOnly: false },
      width: '700px'
    }).afterClosed().subscribe(updatedData => {
      if (updatedData) {
        if (updatedData.action && updatedData.action === 'delete') {
          if (confirm('¿Estás seguro de que deseas eliminar este evento?')) {
            const eventDocRef = doc(this.firestore, 'eventos', updatedData.id);
            deleteDoc(eventDocRef)
              .then(() => this.ngZone.run(() => this.fetchEvents()))
              .catch(err => console.error('Error al eliminar el evento:', err));
          }
        } else {
          const eventDocRef = doc(this.firestore, 'eventos', updatedData.id);
          updateDoc(eventDocRef, updatedData)
            .then(() => this.ngZone.run(() => this.fetchEvents()))
            .catch(err => console.error('Error al actualizar el evento:', err));
        }
      }
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
      profesional: '#FF5722',
      ocio: '#4CAF50',
      personal: '#9C27B0',
      academico: '#03A9F4'
    };
    return etiqueta ? etiquetaColors[etiqueta.toLowerCase()] || '#757575' : '#757575';
  }
}

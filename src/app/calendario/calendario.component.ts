import { Component, OnInit } from '@angular/core';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ApiEndpointsService } from '../api-endpoints.service';
import { MatDialog } from '@angular/material/dialog';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css']
})
export class CalendarioComponent implements OnInit {
  // Se almacenan tanto el UID (si fuera necesario) como el nombre del usuario actual.
  currentUserId: string = '';
  currentUserName: string = '';

  // Opciones del calendario, se usa eventContent para personalizar el renderizado y mostrar el badge (Host)
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    height: 600,
    plugins: [dayGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,dayGridDay'
    },
    eventContent: (arg) => {
      // Se genera el contenido del evento; si el rol es Host, se añade un badge.
      let roleBadge = '';
      if (arg.event.extendedProps['role'] === 'Host') {
        roleBadge = '<span class="event-host-label">(Host)</span>';
      }
      const titleHtml = `<div>${arg.event.title} ${roleBadge}</div>`;
      return { html: titleHtml };
    },
    eventClick: this.handleEventClick.bind(this),
    editable: true,
    events: [] // Se llenará al obtener la data.
  };

  // Listas locales (para la sección inferior, por ejemplo)
  yourEvents: any[] = [];
  joinedEvents: any[] = [];

  selectedDate: Date | null = null;
  currentMonth: string = '';

  constructor(
    private http: HttpClient,
    private apiEndpoints: ApiEndpointsService,
    private dialog: MatDialog,
    private auth: Auth,
    private firestore: Firestore
  ) {}

  ngOnInit(): void {
    // Obtenemos al usuario autenticado y su nombre desde Firestore.
    authState(this.auth).subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        const userDocRef = doc(this.firestore, "usuarios", user.uid);
        docData(userDocRef, { idField: 'id' }).subscribe((data: any) => {
          this.currentUserName = data?.name || user.displayName || 'Usuario';
          const today = new Date();
          this.currentMonth = this.formatMonth(today);
          this.fetchEvents();
        });
      } else {
        console.error('No hay usuario logueado');
      }
    });
  }

  // Se obtiene la data de la API (REST) y se mapea para el calendario
  fetchEvents(): void {
    this.http.get<any[]>(this.apiEndpoints.eventosEndpoint).subscribe({
      next: (events: any[]) => {
        // Separamos eventos en función del nombre del creador.
        // Si 'creadorId' coincide con currentUserName, se considera un evento propio (Host).
        this.yourEvents = events.filter(e => e.creadorId === this.currentUserName);
        this.joinedEvents = events.filter(e => e.creadorId !== this.currentUserName);

        const calendarEvents: EventInput[] = events.map(e => ({
          id: e.id,  // Asegúrate de que viene el ID del evento desde la API.
          title: e.codigo || e.title,
          start: e.horaInicio, // Se espera un string ISO o formato aceptado
          backgroundColor: e.creadorId === this.currentUserName ? '#2196F3' : '#E91E63',
          borderColor: e.creadorId === this.currentUserName ? '#1976d2' : '#C2185B',
          extendedProps: {
            description: e.descripcion,
            // Asignamos el rol "Host" si el creador (nombre) coincide; de lo contrario "Participant"
            role: e.creadorId === this.currentUserName ? 'Host' : 'Participant',
            // Pasamos también citasReservadas para usarlo en el "leave" operation.
            citasReservadas: e.citasReservadas
          }
        }));

        // Actualizamos el calendario
        this.calendarOptions.events = calendarEvents;
      },
      error: err => {
        console.error('Error al obtener eventos:', err);
      }
    });
  }

  formatMonth(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    return new Intl.DateTimeFormat('es-ES', options).format(date);
  }

  handleEventClick(info: any): void {
    const event = info.event;
    let details = `Título: ${event.title}\n`;
    details += `Fecha: ${event.start?.toLocaleString()}\n`;
    if (event.extendedProps.description) {
      details += `Descripción: ${event.extendedProps.description}\n`;
    }
    if (event.extendedProps.role) {
      details += `Rol: ${event.extendedProps.role}\n`;
    }
    alert(details);
  }

  // Abre un pop-up con el detalle (puedes usar un dialog en lugar de alert)
  openEventDetail(event: any): void {
    let details = `Título: ${event.codigo || event.title}\n`;
    details += `Fecha: ${new Date(event.horaInicio).toLocaleString()}\n`;
    details += `Descripción: ${event.descripcion}\n`;
    details += `Rol: ${event.creadorId === this.currentUserName ? 'Host' : 'Participant'}\n`;
    alert(details);
  }

  /**
   * Cuando el usuario hace clic en el botón Leave (en un evento de Joined Events),
   * se realiza un PATCH al endpoint de reservas para quitar su reserva en ese evento.
   * Se recorre el objeto citasReservadas para encontrar la entrada cuyo reservadoPor coincide
   * con el currentUserName. Se envía en el payload la hora de la reserva y se establece
   * reservadoPor a "".
   */
  leaveEvent(event: any): void {
    // Verificamos que el evento tenga citasReservadas
    if (!event.citasReservadas) {
      alert("No hay reservas registradas en este evento.");
      return;
    }
    let reservedHour: string = "";
    // Suponemos que citasReservadas es un objeto con claves arbitrarias
    for (const key in event.citasReservadas) {
      if (event.citasReservadas[key].reservadoPor === this.currentUserName) {
        reservedHour = event.citasReservadas[key].hora;
        break;
      }
    }
    if (!reservedHour) {
      alert("No se encontró una reserva asociada a tu nombre en este evento.");
      return;
    }
    // Construimos el endpoint PATCH para actualizar la reserva del evento
    const patchUrl = this.apiEndpoints.reservarCitaEndpoint(event.id);
    const payload = {
      hora: reservedHour,
      reservadoPor: ""  // Dejar en blanco para indicar que se ha cancelado la reserva
    };
    this.http.patch(patchUrl, payload, { responseType: 'text' }).subscribe({
      next: (response: string) => {
        console.log("Reserva cancelada:", response);
        // Se actualiza la UI automáticamente volviendo a llamar a fetchEvents()
        this.fetchEvents();
      },
      error: (err) => {
        console.error("Error al cancelar la reserva:", err);
        alert("Error al abandonar el evento");
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
}

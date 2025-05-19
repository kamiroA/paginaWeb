import { Component, OnInit } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css']
})
export class CalendarioComponent implements OnInit {

  // Opciones usadas en FullCalendar (se pueden mantener igual)
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    height: 600,
    plugins: [dayGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,dayGridDay'
    },
    // Eventos de ejemplo para el calendario
    events: [
      { title: 'Evento A', date: '2025-05-17' },
      { title: 'Evento B', date: '2025-05-19' }
    ],
    dateClick: this.handleDateClick.bind(this),
    editable: true
  };

  // Simulamos datos para "Your Events"
  yourEvents = [
    {
      title: 'Team Meeting',
      date: '2023-09-15T10:00:00',
      description: 'Monthly team sync and project updates',
      role: 'Host'
    },
    {
      title: 'Product Launch',
      date: '2023-09-20T14:00:00',
      description: 'New product line presentation',
      role: 'Participant'
    }
  ];

  // Simulamos datos para "Joined Events"
  joinedEvents = [
    {
      title: 'Industry Conference',
      date: '2023-09-25T09:00:00',
      description: 'Annual tech conference'
    },
    {
      title: 'Workshop',
      date: '2023-09-28T15:00:00',
      description: 'Design thinking workshop'
    }
  ];

  // Propiedades para el panel superior (ejemplo anterior de "Your Calendar")
  selectedDate: Date | null = null;
  eventsOfSelectedDay: any[] = [];
  currentMonth: string = '';

  constructor() { }

  ngOnInit(): void {
    const today = new Date();
    this.currentMonth = this.formatMonth(today);
  }

  handleDateClick(arg: any): void {
    this.selectedDate = new Date(arg.dateStr);
    const selectedDateStr = arg.dateStr;
    // Aquí podrías filtrar de alguna lista de eventos dependiendo de la fecha
    // Por ejemplo, podrías combinar "yourEvents" y "joinedEvents" o filtrar una de ellas.
    // Para este ejemplo dejamos la parte de "selectedDate" para otro uso.
  }

  formatMonth(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    return new Intl.DateTimeFormat('es-ES', options).format(date);
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

  // Opcionalmente, podrías implementar métodos para "leave" un evento de joinedEvents
  leaveEvent(event: any): void {
    console.log('Leave event:', event);
    // Aquí podrías actualizar la lista eliminando el evento o enviando la petición a backend.
  }
}

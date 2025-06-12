import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { ApiEndpointsService } from '../api-endpoints.service';
import { forkJoin } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface JoinEventData {
  event: any;            // El evento debe incluir: id, codigo, etc.
  currentUser?: string;  // Nombre del usuario logueado.
}

@Component({
  selector: 'app-join-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatChipsModule,
    MatButtonModule
    
  ],
  templateUrl: './join-event-dialog.component.html',
  styleUrls: ['./join-event-dialog.component.css']
})
export class JoinEventDialogComponent implements OnInit {
  availableHours: string[] = [];
  reservedAppointments: { hora: string, reservadoPor: string }[] = [];
  selectedHoras: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<JoinEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: JoinEventData,
    private http: HttpClient,
    private endpoints: ApiEndpointsService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    let reservedHours: string[] = [];
    if (this.data.event.citasReservadas) {
      this.reservedAppointments = Object.entries(this.data.event.citasReservadas)
        .map(([hora, valor]) => ({ hora, reservadoPor: (valor as string) || 'Sin nombre' }));
      reservedHours = Object.keys(this.data.event.citasReservadas);
    }
    this.availableHours = this.data.event.horasDisponibles.filter((hora: string) => {
      return !reservedHours.includes(hora);
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  toggleSelection(hora: string): void {
    const index = this.selectedHoras.indexOf(hora);
    if (index >= 0) {
      this.selectedHoras.splice(index, 1);
    } else {
      this.selectedHoras.push(hora);
    }
  }

  joinEvent(): void {
  if (!this.selectedHoras || this.selectedHoras.length === 0) {
    this.snackBar.open("Por favor selecciona al menos una hora.", "Cerrar", { duration: 3000 });
    return;
  }

  // Obtenemos las reservas existentes si las hay; de lo contrario, un objeto vacío.
  const reservasExistentes: { [key: string]: string } = this.data.event.citasReservadas || {};

  // Creamos un nuevo objeto combinando las reservas existentes con las nuevas.
  const nuevasReservas: { [key: string]: string } = { ...reservasExistentes };

  this.selectedHoras.forEach((hora: string) => {
    nuevasReservas[hora] = this.data.currentUser || 'Sin nombre';
  });

  // Obtenemos el ID del evento y preparamos la URL del endpoint
  const eventId = this.data.event.id;
  if (!eventId) {
    this.snackBar.open("ID del evento no definido.", "Cerrar", { duration: 3000 });
    return;
  }
  const url = this.endpoints.reservarCitaEndpoint(eventId);

  // Enviamos una única petición PATCH con el objeto de reservas combinado
  this.http.patch(url, nuevasReservas, { responseType: 'text' }).subscribe({
    next: (response: string) => {
      console.log('Respuesta del PATCH:', response);
      // Una vez actualizado, obtenemos nuevamente el evento para actualizar la vista local.
      const getUrl = this.endpoints.getEventoByIdEndpoint(eventId);
      this.http.get<any>(getUrl).subscribe({
        next: updatedEvent => {
          console.log('Evento actualizado recibido:', updatedEvent);
          this.data.event = updatedEvent;
          this.ngOnInit();
          this.snackBar.open('Te has unido al evento exitosamente.', "Cerrar", { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: err => {
          this.snackBar.open('Error al refrescar el evento: ' + err.message, "Cerrar", { duration: 3000 });
          this.dialogRef.close(true);
        }
      });
    },
    error: (err) => {
      this.snackBar.open('Error al actualizar la reserva: ' + err.message, "Cerrar", { duration: 3000 });
    }
  });
}

}

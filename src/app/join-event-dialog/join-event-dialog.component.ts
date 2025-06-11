import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { ApiEndpointsService } from '../api-endpoints.service';
import { forkJoin } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface JoinEventData {
  event: any;            // El evento debe incluir: id, codigo, descripcion, horaInicio, horaFin, horasDisponibles, citasReservadas, etc.
  currentUser?: string;  // Nombre del usuario logueado, por ejemplo "Camilo"
}

@Component({
  selector: 'app-join-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatButtonModule
  ],
  templateUrl: './join-event-dialog.component.html',
  styleUrls: ['./join-event-dialog.component.css']
})
export class JoinEventDialogComponent implements OnInit {
  // Control de selección múltiple, aunque se espere una sola hora
  horaControl = new FormControl<(string | null)[]>([], Validators.required);
  availableHours: string[] = [];
  // Se asume que en Firestore, citasReservadas es un mapa: clave = hora elegida, valor = nombre
  reservedAppointments: { hora: string, reservadoPor: string }[] = [];

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
      // Convertir el mapa en un array de objetos { hora, reservadoPor }
      this.reservedAppointments = Object.entries(this.data.event.citasReservadas)
        .map(([hora, valor]) => {
          return { hora, reservadoPor: (valor as string) || 'Sin nombre' };
        });
      reservedHours = Object.keys(this.data.event.citasReservadas);
    }
    // Calcular las horas disponibles excluyendo las reservas existentes
    this.availableHours = this.data.event.horasDisponibles.filter((hora: string) => {
      return !reservedHours.includes(hora);
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  joinEvent(): void {
    let selectedHoras = this.horaControl.value;
    // Asegurar que selectedHoras sea siempre un arreglo
    if (!Array.isArray(selectedHoras)) {
      selectedHoras = [selectedHoras];
    }
    if (!selectedHoras || !selectedHoras.length) {
      this.snackBar.open("Por favor selecciona al menos una hora.", "Cerrar", { duration: 3000 });
      return;
    }
    // Enviar una petición PATCH por cada hora seleccionada
    const requests = selectedHoras.map((hora: string | null) => {
      if (!hora) {
        throw new Error('Hora seleccionada es null o indefinida');
      }
      const eventId = this.data.event.id; // Se asume que el objeto evento tiene la propiedad 'id'
      if (!eventId) {
        throw new Error('ID del evento no definido');
      }
      const url = this.endpoints.reservarCitaEndpoint(eventId);
      const payload = {
        [hora]: this.data.currentUser || 'Sin nombre'
      };
      return this.http.patch(url, payload, { responseType: 'text' });
    });

    forkJoin(requests).subscribe({
      next: () => {
        const eventId = this.data.event.id;
        if (!eventId) {
          this.snackBar.open("No se encontró el ID del evento.", "Cerrar", { duration: 3000 });
          return;
        }
        const getUrl = this.endpoints.getEventoByIdEndpoint(eventId);
        this.http.get<any>(getUrl).subscribe({
          next: updatedEvent => {
            this.data.event = updatedEvent;
            // Recalcula las reservas y horas disponibles
            this.ngOnInit();
            this.snackBar.open('Te has unido al evento exitosamente.', "Cerrar", { duration: 3000 });
            this.dialogRef.close(true);
          },
          error: err => {
            this.snackBar.open('Error al actualizar la información del evento: ' + err.message, "Cerrar", { duration: 3000 });
            this.dialogRef.close(true);
          }
        });
      },
      error: (err) => {
        this.snackBar.open('Error al unirse al evento: ' + err.message, "Cerrar", { duration: 3000 });
      }
    });
  }
}

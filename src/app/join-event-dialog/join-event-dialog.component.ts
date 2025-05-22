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
  // Control de selección múltiple (aunque en la práctica se espere una sola hora)
  horaControl = new FormControl<(string | null)[]>([], Validators.required);
  availableHours: string[] = [];
  // Ahora se asume que en Firestore, citasReservadas es un mapa: clave = hora elegida, valor = nombre
  reservedAppointments: { hora: string, reservadoPor: string }[] = [];

  constructor(
    public dialogRef: MatDialogRef<JoinEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: JoinEventData,
    private http: HttpClient,
    private endpoints: ApiEndpointsService
  ) {}

  ngOnInit(): void {
    let reservedHours: string[] = [];
    if (this.data.event.citasReservadas) {
      // Mapeamos el mapa con Object.entries para obtener un array de objetos { hora, reservadoPor }
      this.reservedAppointments = Object.entries(this.data.event.citasReservadas)
        .map(([hora, valor]) => {
          return { hora, reservadoPor: (valor as string) || 'Sin nombre' };
        });
      reservedHours = Object.keys(this.data.event.citasReservadas);
    }
    // Calcula las horas disponibles quitando las ya reservadas.
    this.availableHours = this.data.event.horasDisponibles.filter((hora: string) => {
      return !reservedHours.includes(hora);
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  joinEvent(): void {
    let selectedHoras = this.horaControl.value;
    // Asegurarse de que selectedHoras sea siempre un arreglo (incluso si se selecciona solo una hora)
    if (!Array.isArray(selectedHoras)) {
      selectedHoras = [selectedHoras];
    }
    if (!selectedHoras || !selectedHoras.length) {
      alert("Por favor selecciona al menos una hora.");
      return;
    }
    // Se enviará una petición PATCH por cada hora seleccionada.
    const requests = selectedHoras.map((hora: string | null) => {
      if (!hora) {
        throw new Error('Hora seleccionada es null o indefinida');
      }
      const eventId = this.data.event.id; // Se asume que el objeto evento tiene la propiedad 'id'
      if (!eventId) {
        throw new Error('ID del evento no definido');
      }
      const url = this.endpoints.reservarCitaEndpoint(eventId);
      // Envía el payload directo, es decir, el objeto { [hora]: currentUser }
      const payload = {
        [hora]: this.data.currentUser || 'Sin nombre'
      };
      return this.http.patch(url, payload, { responseType: 'text' });
    });
    forkJoin(requests).subscribe({
      next: () => {
        // Luego de las peticiones, se actualiza el evento mediante un GET
        const eventId = this.data.event.id;
        if (!eventId) {
          alert("No se encontró el ID del evento.");
          return;
        }
        const getUrl = this.endpoints.getEventoByIdEndpoint(eventId);
        this.http.get<any>(getUrl).subscribe({
          next: updatedEvent => {
            this.data.event = updatedEvent;
            // Recalcula las horas disponibles (actualizando reservedAppointments y availableHours)
            this.ngOnInit();
            alert('Te has unido al evento exitosamente.');
            this.dialogRef.close(true);
          },
          error: err => {
            alert('Error al actualizar la información del evento: ' + err.message);
            this.dialogRef.close(true);
          }
        });
      },
      error: (err) => {
        alert('Error al unirse al evento: ' + err.message);
      }
    });
  }
}

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { ApiEndpointsService } from '../api-endpoints.service';

// Se extiende la interfaz para incluir currentUser (nombre del usuario logueado)
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
  // Control para seleccionar la hora, con validación requerida
  horaControl = new FormControl('', Validators.required);

  // Array que contendrá las horas disponibles filtradas (quitando las reservadas)
  availableHours: string[] = [];

  // Array con las reservas extraídas, donde cada reserva tendrá la hora y el nombre (del que reservó)
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
    this.reservedAppointments = Object.values(this.data.event.citasReservadas)
      .map((entry: any) => {
        let hora: string = '';
        let reservadoPor: string = '';
        // Si la entrada es un objeto con la propiedad 'hora'
        if (entry && typeof entry === 'object' && entry.hora) {
          hora = entry.hora;
          reservadoPor = entry.nombre || entry.reservadoPor || this.data.currentUser || 'Sin nombre';
        }
        // Si la entrada es un array, se verifica cuál de sus elementos es una fecha válida.
        else if (Array.isArray(entry)) {
          if (!isNaN(Date.parse(entry[0]))) {
            hora = entry[0];
            reservadoPor = entry[1] || this.data.currentUser || 'Sin nombre';
          } else if (!isNaN(Date.parse(entry[1]))) {
            hora = entry[1];
            reservadoPor = entry[0] || this.data.currentUser || 'Sin nombre';
          }
        }
        // Si la entrada es una cadena, se verifica que sea una fecha válida.
        else if (typeof entry === 'string') {
          if (!isNaN(Date.parse(entry))) {
            hora = entry;
            reservadoPor = this.data.currentUser || 'Sin nombre';
          } else {
            // Si no es una fecha válida, devolver null para descartarla.
            return null;
          }
        }
        return { hora, reservadoPor };
      })
      .filter(reservation => reservation !== null);
    reservedHours = this.reservedAppointments.map(r => r.hora);
  }

  // Filtra las horas disponibles quitando las que ya están reservadas
  this.availableHours = this.data.event.horasDisponibles.filter((hora: string) => {
    return !reservedHours.includes(hora);
  });
}


  // Cierra el diálogo sin acción
  onCancel(): void {
    this.dialogRef.close();
  }

  // Envía la solicitud para reservar la hora seleccionada, incluyendo el nombre del usuario logueado
  joinEvent(): void {
    const selectedHora = this.horaControl.value;
    const url = this.endpoints.reservarCitaEndpoint(this.data.event.id);
    // El payload incluye "hora" y "reservadoPor" (nombre del usuario logueado)
    const payload = {
      hora: selectedHora,
      reservadoPor: this.data.currentUser || 'Sin nombre'
    };
    this.http.patch(url, payload, { responseType: 'text' }).subscribe({
      next: () => {
        alert('Te has unido al evento exitosamente.');
        this.dialogRef.close(true);
      },
      error: (err) => {
        alert('Error al unirse al evento: ' + err.message);
      }
    });
  }
}

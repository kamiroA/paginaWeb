import { Component, Inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { finalize, take } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiEndpointsService } from '../api-endpoints.service';

@Component({
  selector: 'app-create-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './create-event-dialog.component.html',
  styleUrls: ['./create-event-dialog.component.css']
})
export class CreateEventDialogComponent {
  eventForm: FormGroup;
  availableSlots: string[] = [];
  isLoading: boolean = false;
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CreateEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private endpoints: ApiEndpointsService,
    private snackBar: MatSnackBar
  ) {
    // Configuración del formulario con validadores
    this.eventForm = this.fb.group({
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],
      horaInicio: ['', Validators.required],
      horaFin: ['', Validators.required],
      horasDisponibles: [[]],
      etiqueta: ['', Validators.required]
    }, { validators: this.checkDates });

    this.eventForm.get('horaInicio')?.valueChanges.subscribe(() => this.updateAvailableSlots());
    this.eventForm.get('horaFin')?.valueChanges.subscribe(() => this.updateAvailableSlots());
  }

  /**
   * Valida que la hora de inicio sea anterior a la de fin.
   */
  checkDates(group: AbstractControl): ValidationErrors | null {
    const inicio = group.get('horaInicio')?.value;
    const fin = group.get('horaFin')?.value;
    if (inicio && fin) {
      const hInicio = new Date(inicio);
      const hFin = new Date(fin);
      return hInicio.getTime() < hFin.getTime() ? null : { dateMismatch: true };
    }
    return null;
  }

  /**
   * Calcula los slots (intervalos de 30 minutos) entre hora de inicio y fin.
   */
  updateAvailableSlots(): void {
    const inicio = this.eventForm.get('horaInicio')?.value;
    const fin = this.eventForm.get('horaFin')?.value;
    if (inicio && fin) {
      const startDate = new Date(inicio);
      const endDate = new Date(fin);
      const slots: string[] = [];
      let current = new Date(startDate);
      const stepMinutes = 30;
      while (current < endDate) {
        slots.push(current.toISOString());
        current.setMinutes(current.getMinutes() + stepMinutes);
      }
      this.availableSlots = slots;
    } else {
      this.availableSlots = [];
    }
  }

  /**
   * Cierra el diálogo.
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Envía el formulario y llama a la API para crear el evento, mostrando el loader hasta obtener respuesta.
   * Se utiliza un bloqueo (isLoading) y el operador take(1) para asegurar que solo se emite y se procesa una vez la solicitud.
   */
  onSubmit(): void {
    // Si ya se está procesando la solicitud o el formulario no es válido, se evita el envío.
    if (this.isLoading || !this.eventForm.valid) { 
      return;
    }
    
    this.isLoading = true;
    const formValue = this.eventForm.value;

    if (!formValue.horasDisponibles) {
      formValue.horasDisponibles = [];
    }
    // Se inicializa citasReservadas como objeto vacío
    formValue.citasReservadas = {};
    // Se asigna el nombre del creador (usando el nombre)
    formValue.creadorId = this.data.currentUserName;

    const createEventUrl = this.endpoints.eventosEndpoint;
    
    this.http.post(createEventUrl, formValue, { responseType: 'text' })
      .pipe(
        take(1),
        finalize(() => { this.isLoading = false; })
      )
      .subscribe({
        next: (response: string) => {
          this.snackBar.open('Evento creado con éxito.', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
          // Cerramos el diálogo con el valor creado
          this.dialogRef.close(formValue);
        },
        error: (error) => {
          this.snackBar.open('Error creando evento.', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-error']
          });
        }
      });
  }
}

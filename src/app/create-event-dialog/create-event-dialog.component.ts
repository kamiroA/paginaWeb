import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

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
    MatButtonModule
  ],
  templateUrl: './create-event-dialog.component.html',
  styleUrls: ['./create-event-dialog.component.css']
})
export class CreateEventDialogComponent {
  eventForm: FormGroup;
  availableSlots: string[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CreateEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Se crea el formulario con los campos requeridos.
    this.eventForm = this.fb.group({
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],
      horaInicio: ['', Validators.required],
      horaFin: ['', Validators.required],
      horasDisponibles: [[]]  // Se inicializa como array vacío
    }, { validators: this.checkDates });

    // Cada vez que cambie la hora de inicio o fin, se recalculan los slots disponibles.
    this.eventForm.get('horaInicio')?.valueChanges.subscribe(() => this.updateAvailableSlots());
    this.eventForm.get('horaFin')?.valueChanges.subscribe(() => this.updateAvailableSlots());
  }

  /**
   * Valida que la hora de inicio sea anterior a la hora de fin.
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
   * Calcula los horarios disponibles (slots) entre la hora de inicio y la hora fin,
   * usando un intervalo de 30 minutos.
   */
  updateAvailableSlots(): void {
    const inicio = this.eventForm.get('horaInicio')?.value;
    const fin = this.eventForm.get('horaFin')?.value;
    if (inicio && fin) {
      const startDate = new Date(inicio);
      const endDate = new Date(fin);
      const slots: string[] = [];
      const stepMinutes = 30; // Intervalo en minutos
      let current = new Date(startDate);
      // Mientras no se alcance la hora de fin, se agregan los slots
      while (current < endDate) {
        slots.push(current.toISOString());
        current.setMinutes(current.getMinutes() + stepMinutes);
      }
      this.availableSlots = slots;
    } else {
      this.availableSlots = [];
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.eventForm.valid) {
      // Se preparan los datos para enviar al API.
      let formValue = this.eventForm.value;
      // Si no se han seleccionado horas disponibles, se deja como un array vacío.
      if (!formValue.horasDisponibles) {
        formValue.horasDisponibles = [];
      }
      // Se establece citasReservadas como un mapa vacío.
      formValue.citasReservadas = {};
      // (Opcional) Puedes asignar aquí el creadorId según el usuario actual.
      formValue.creadorId = '';
      this.dialogRef.close(formValue);
    }
  }
}

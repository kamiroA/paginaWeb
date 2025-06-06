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
  availableSlots: string[] = []; // Slots calculados entre horaInicio y horaFin

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CreateEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Creamos el formulario con los campos que coinciden con el objeto Evento,
    // incluyendo el nuevo campo "etiqueta".
    this.eventForm = this.fb.group({
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],
      horaInicio: ['', Validators.required],
      horaFin: ['', Validators.required],
      horasDisponibles: [[]],
      etiqueta: ['', Validators.required]
    }, { validators: this.checkDates });

    // Cuando cambie la hora de inicio o fin, se recalculan los slots disponibles.
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
   * Calcula los slots disponibles entre la hora de inicio y hora fin utilizando un intervalo de 30 minutos.
   * Estos slots se presentarán en el selector para que el usuario elija las horas disponibles.
   */
  updateAvailableSlots(): void {
    const inicio = this.eventForm.get('horaInicio')?.value;
    const fin = this.eventForm.get('horaFin')?.value;
    if (inicio && fin) {
      const startDate = new Date(inicio);
      const endDate = new Date(fin);
      const slots: string[] = [];
      const stepMinutes = 30; // Intervalo de 30 minutos
      let current = new Date(startDate);
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
      // Se obtiene la información del formulario.
      let formValue = this.eventForm.value;
      if (!formValue.horasDisponibles) {
        formValue.horasDisponibles = [];
      }
      formValue.citasReservadas = {};
      // Asigna el nombre del creador usando la propiedad pasada en los datos del diálogo.
      formValue.creadorId = this.data.currentUserName; // Se guarda el nombre, no el ID.
      this.dialogRef.close(formValue);
    }
  }
}

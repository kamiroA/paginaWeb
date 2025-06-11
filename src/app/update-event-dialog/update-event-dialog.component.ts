import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { updateDoc, doc, docData } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';
import { HttpClient } from '@angular/common/http';
import { ApiEndpointsService } from '../api-endpoints.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-update-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './update-event-dialog.component.html',
  styleUrls: ['./update-event-dialog.component.css']
})
export class UpdateEventDialogComponent implements OnInit {
  eventForm: FormGroup;
  availableSlots: string[] = [];
  editMode: boolean = false;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private http: HttpClient,
    private apiEndpoints: ApiEndpointsService,
    public dialogRef: MatDialogRef<UpdateEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {
    // Se agregó el control "reserva" para usarlo en el template (por ej. en un getter reservaDisplay).
    this.eventForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      codigo: [{ value: '', disabled: true }, Validators.required],
      descripcion: [{ value: '', disabled: true }, Validators.required],
      horaInicio: [{ value: '', disabled: true }, Validators.required],
      horaFin: [{ value: '', disabled: true }, Validators.required],
      horasDisponibles: [{ value: [], disabled: true }],
      etiqueta: [{ value: '', disabled: true }, Validators.required],
      creadorId: [{ value: '', disabled: true }],
      reserva: [{ value: null, disabled: true }]
    }, { validators: this.checkDates });
  }

  ngOnInit(): void {
    this.getEventById();
    this.eventForm.get('horaInicio')?.valueChanges.subscribe(() => this.updateAvailableSlots());
    this.eventForm.get('horaFin')?.valueChanges.subscribe(() => this.updateAvailableSlots());
    if (this.data.readOnly) {
      this.eventForm.disable();
    }
  }

  /**
   * Convierte un valor de fecha (Firestore Timestamp o string) al formato "yyyy-MM-ddTHH:mm"
   * usado en inputs 'datetime-local'
   */
  private formatDateForInput(dateValue: any): string {
    let date: Date;
    if (typeof dateValue === 'object' && dateValue.seconds) {
      date = new Date(dateValue.seconds * 1000);
    } else {
      date = new Date(dateValue);
    }
    const pad = (num: number): string => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /**
   * Valida que horaInicio sea menor que horaFin.
   */
  checkDates(group: AbstractControl): ValidationErrors | null {
    const inicio = group.get('horaInicio')?.value;
    const fin = group.get('horaFin')?.value;
    if (inicio && fin) {
      return new Date(inicio).getTime() < new Date(fin).getTime() ? null : { dateMismatch: true };
    }
    return null;
  }

  /**
   * Calcula los intervalos (slots) de 30 minutos entre horaInicio y horaFin.
   */
  updateAvailableSlots(): void {
    const inicio = this.eventForm.get('horaInicio')?.value;
    const fin = this.eventForm.get('horaFin')?.value;
    if (inicio && fin) {
      const startDate = new Date(inicio);
      const endDate = new Date(fin);
      let slots: string[] = [];
      let current = new Date(startDate);
      while (current < endDate) {
        slots.push(current.toISOString());
        current.setMinutes(current.getMinutes() + 30);
      }
      this.availableSlots = slots;
    } else {
      this.availableSlots = [];
    }
  }

  /**
   * Se suscribe al documento del evento en Firestore para obtener los datos actuales.
   */
  getEventById(): void {
    const eventDocRef = doc(this.firestore, 'eventos', this.data.id);
    docData(eventDocRef, { idField: 'id' }).subscribe(
      (data: any) => {
        const fetchedData = {
          id: data.id,
          codigo: data.codigo || data.title || '',
          descripcion: data.descripcion || '',
          horaInicio: data.horaInicio ? this.formatDateForInput(data.horaInicio) : '',
          horaFin: data.horaFin ? this.formatDateForInput(data.horaFin) : '',
          horasDisponibles: data.horasDisponibles || [],
          etiqueta: data.etiqueta || '',
          creadorId: data.creadorId || '',
          reserva: data.reserva || null
        };
        this.eventForm.patchValue(fetchedData);
      },
      error => console.error('Error al obtener el evento:', error)
    );
  }

  onEnableEdit(): void {
    this.editMode = true;
    this.eventForm.enable();
    this.eventForm.get('id')?.disable();
    this.eventForm.get('creadorId')?.disable();
  }

  onCancelEdit(): void {
    this.editMode = false;
    this.getEventById();
    this.eventForm.disable();
  }

  /**
   * Al enviar el formulario, convierte horaInicio y horaFin de string a objetos Date para actualizar Firestore.
   * Además, elimina la propiedad "id" del objeto de actualización.
   */
  onSubmit(): void {
    if (this.eventForm.valid) {
      const formValue = this.eventForm.getRawValue();
      const updateData = {
        ...formValue,
        horaInicio: new Date(formValue.horaInicio),
        horaFin: new Date(formValue.horaFin)
      };
      const { id, ...dataToUpdate } = updateData;
      const eventDocRef = doc(this.firestore, 'eventos', id);
      updateDoc(eventDocRef, dataToUpdate)
        .then(() => {
          this.snackBar.open('Evento actualizado exitosamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close(updateData);
        })
        .catch(err => {
          this.snackBar.open('Error al actualizar el evento: ' + err, 'Cerrar', { duration: 3000 });
          console.error('Error al actualizar el evento:', err);
        });
    }
  }

  onDelete(): void {
    if (confirm('¿Estás seguro de que deseas eliminar este evento?')) {
      this.dialogRef.close({ id: this.data.id, action: 'delete' });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  /**
   * Copia el ID del evento al portapapeles.
   */
  copyId(id: string): void {
    navigator.clipboard.writeText(id)
      .then(() => {
        this.snackBar.open('ID copiado', 'Cerrar', { duration: 2000 });
      })
      .catch(err => {
        this.snackBar.open('Error al copiar el ID', 'Cerrar', { duration: 2000 });
        console.error('Error al copiar el ID:', err);
      });
  }

  /**
   * Getter para mostrar la reserva de forma formateada en el template.
   */
  get reservaDisplay(): string {
    const reserva = this.eventForm.get('reserva')?.value;
    if (reserva instanceof Date) {
      return reserva.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (typeof reserva === 'string' && reserva.trim().length > 0) {
      return reserva;
    }
    return 'Sin reserva';
  }
}

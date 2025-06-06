import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { ApiEndpointsService } from '../api-endpoints.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
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
    private http: HttpClient,
    private apiEndpoints: ApiEndpointsService,
    public dialogRef: MatDialogRef<UpdateEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
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
   * Procesa el campo de reserva:
   * - Si es un Firestore Timestamp (con propiedad seconds), lo convierte a Date.
   * - Si es un objeto (por ejemplo, un mapa con reservas), itera sobre sus entradas y para cada par
   *   extrae la hora (formateada) y el nombre, devolviendo una cadena del estilo "08:30 - Nombre".
   * - En otros casos, lo devuelve tal como está.
   */
  private parseReserva(value: any): any {
    if (!value) return null;
    if (typeof value === 'object') {
      if ('seconds' in value) {
        return new Date(value.seconds * 1000);
      }
      // Se asume que es un mapa. Por ejemplo: { "2025-06-03T08:30:00.000Z": "Camilo Armando Maita" }
      let resultArr: string[] = [];
      for (const [timeStr, name] of Object.entries(value)) {
        const date = new Date(timeStr);
        let formattedTime: string;
        if (isNaN(date.getTime())) {
          formattedTime = timeStr; // En caso de que no se convierta
        } else {
          formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        resultArr.push(`${formattedTime} - ${name}`);
      }
      return resultArr.join(', ');
    }
    return value;
  }

  /**
   * Convierte un valor de fecha (Firestore Timestamp o string) al formato "yyyy-MM-ddTHH:mm"
   * para inputs de tipo datetime-local.
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

  checkDates(group: AbstractControl): ValidationErrors | null {
    const inicio = group.get('horaInicio')?.value;
    const fin = group.get('horaFin')?.value;
    if (inicio && fin) {
      return new Date(inicio).getTime() < new Date(fin).getTime() ? null : { dateMismatch: true };
    }
    return null;
  }

  updateAvailableSlots(): void {
    const inicio = this.eventForm.get('horaInicio')?.value;
    const fin = this.eventForm.get('horaFin')?.value;
    if (inicio && fin) {
      const startDate = new Date(inicio);
      const endDate = new Date(fin);
      let slots: string[] = [];
      const stepMinutes = 30;
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

  getEventById(): void {
    const eventId = this.data.id;
    this.http.get<any>(this.apiEndpoints.getEventoByIdEndpoint(eventId)).subscribe(
      data => {
        const reservaValue = this.parseReserva(data.reserva || data.citasReservadas);
        const fetchedData = {
          id: data.id,
          codigo: data.codigo || data.title || '',
          descripcion: data.descripcion || '',
          horaInicio: data.horaInicio ? this.formatDateForInput(data.horaInicio) : '',
          horaFin: data.horaFin ? this.formatDateForInput(data.horaFin) : '',
          reserva: reservaValue,
          horasDisponibles: data.horasDisponibles || [],
          etiqueta: data.etiqueta || '',
          creadorId: data.creadorId || ''
        };
        this.eventForm.patchValue(fetchedData);
      },
      error => {
        console.error('Error al obtener el evento por id', error);
      }
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

  onSubmit(): void {
    if (this.eventForm.valid) {
      const formValue = this.eventForm.getRawValue();
      this.dialogRef.close(formValue);
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

  // Método para copiar el ID al portapapeles.
  copyId(id: string): void {
    navigator.clipboard.writeText(id)
      .then(() => console.log('ID copiado'))
      .catch(err => console.error('Error al copiar el ID', err));
  }

  // Propiedad computada para mostrar la reserva formateada.
  // Si la reserva es un objeto Date, se formatea a hora; si ya es un string (con hora y nombre), se devuelve tal cual.
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

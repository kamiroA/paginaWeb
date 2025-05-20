// src/app/navbar/navbar.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { ApiEndpointsService } from '../api-endpoints.service';
import { CreateEventDialogComponent } from '../create-event-dialog/create-event-dialog.component';
import { EditProfileComponent } from '../edit-perfil/edit-perfil.component';

// Importar Firebase Auth y Firestore
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  // Propiedades para los datos del usuario
  userName: string = 'Usuario'; // Valor por defecto
  profileImage: string = 'DefaultPF.png'; // Imagen por defecto

  // Servicios inyectados
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);

  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
    private endpoints: ApiEndpointsService
  ) {}

  ngOnInit(): void {
    // Suscribirse a los cambios del usuario autenticado
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        const uid = user.uid;
        // Referencia al documento en la colección "users"
        const userDocRef = doc(this.firestore, "usuarios", uid);
        // Suscribirse a los datos del documento
        docData(userDocRef, { idField: 'id' }).subscribe((data: any) => {
          // Se actualizan las propiedades con lo almacenado en Firestore (o usa displayName del usuario si lo prefieres)
          this.userName = data?.name || user.displayName || 'Usuario';
          // Se actualiza el campo fotoPerfil y, si no existe, se usa la imagen por defecto
          this.profileImage = data?.fotoPerfil || 'DefaultPF.png';
        });
      }
    });
  }

  openCreateEventDialog(): void {
    const dialogRef = this.dialog.open(CreateEventDialogComponent, {
      width: '50vw',
      minWidth: '600px',
      maxWidth: '90vw',
      height: '70vh',
      minHeight: '400px'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createEvent(result);
      }
    });
  }

  createEvent(eventData: any): void {
    this.http.post(this.endpoints.eventosEndpoint, eventData, { responseType: 'text' })
      .subscribe({
        next: (response: string) => {
          console.log('Evento creado:', response);
        },
        error: err => {
          console.error('Error creando evento:', err);
        }
      });
  }

  // Método para abrir el diálogo de edición del perfil
  openEditProfileDialog(): void {
    const dialogRef = this.dialog.open(EditProfileComponent, {
      width: '50vw',
      minWidth: '600px',
      maxWidth: '90vw',
      height: '50vh',
      minHeight: '400px'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Perfil actualizado', result);
      }
    });
  }
}

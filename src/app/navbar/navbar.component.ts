import { Component, OnInit, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ApiEndpointsService } from '../api-endpoints.service';
import { CreateEventDialogComponent } from '../create-event-dialog/create-event-dialog.component';
import { EditProfileComponent } from '../edit-perfil/edit-perfil.component';
import { JoinEventDialogComponent } from '../join-event-dialog/join-event-dialog.component';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

// Importar Firebase Auth y Firestore (versión modular)
import { Auth, onAuthStateChanged, signOut } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
    FormsModule,
    NgIf
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  // Propiedades para los datos del usuario
  userName: string = 'Usuario';
  profileImage: string = 'DefaultPF.png';
  isLogged: boolean = false;

  // ID del usuario actual (cuando está logueado)
  currentUid: string = '';

  // Variable para búsqueda de evento
  eventQuery: string = '';

  // Servicios inyectados
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private router: Router = inject(Router);

  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
    private endpoints: ApiEndpointsService
  ) {}

  ngOnInit(): void {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.isLogged = true;
        this.currentUid = user.uid;
        const userDocRef = doc(this.firestore, "usuarios", user.uid);
        docData(userDocRef, { idField: 'id' }).subscribe((data: any) => {
          this.userName = data?.name || user.displayName || 'Usuario';
          this.profileImage = data?.fotoPerfil || 'DefaultPF.png';
        });
      } else {
        this.isLogged = false;
      }
    });
  }

 openCreateEventDialog(): void {
  const dialogRef = this.dialog.open(CreateEventDialogComponent, {
    width: '50vw',
    minWidth: '600px',
    maxWidth: '90vw',
    height: '70vh',
    minHeight: '400px',
    data: { currentUserName: this.userName }  // Enviamos el nombre del usuario
  });
  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.createEvent(result);
    }
  });
}


  createEvent(eventData: any): void {
  // Se supone que ya se ha asignado el nombre del creador en el diálogo,
  // por lo que no sobrescribimos el valor.
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


  openEditProfileDialog(): void {
    if (!this.isLogged) {
      this.goToLogin();
    } else {
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

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
  
  logout(): void {
    signOut(this.auth)
      .then(() => {
        this.isLogged = false;
        this.userName = 'Usuario';
        this.profileImage = 'DefaultPF.png';
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        console.error("Error al cerrar sesión:", error);
      });
  }

  searchEvent(): void {
    if (!this.eventQuery || this.eventQuery.trim() === '') {
      alert('Por favor ingresa un ID de evento.');
      return;
    }
    const eventId = this.eventQuery.trim();
    const searchUrl = this.endpoints.getEventoByIdEndpoint(eventId);
    this.http.get<any>(searchUrl).subscribe({
      next: (data) => {
        if (data) {
          if (!data.id) {
            data.id = eventId;
          }
          this.dialog.open(JoinEventDialogComponent, {
            width: '400px',
            data: { event: data, currentUser: this.userName }
          });
        } else {
          alert('Evento no encontrado.');
        }
      },
      error: (err) => {
        alert('Error al buscar el evento: ' + err.message);
      }
    });
  }
}

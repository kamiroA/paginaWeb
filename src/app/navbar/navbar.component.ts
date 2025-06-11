import { Component, OnInit, inject, NgZone } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

import { Auth, onAuthStateChanged, signOut } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';

import { ApiEndpointsService } from '../api-endpoints.service';
import { CreateEventDialogComponent } from '../create-event-dialog/create-event-dialog.component';
import { EditProfileComponent } from '../edit-perfil/edit-perfil.component';
import { JoinEventDialogComponent } from '../join-event-dialog/join-event-dialog.component';

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
  userName: string = 'Usuario';
  profileImage: string = 'DefaultPF.png';
  isLogged: boolean = false;
  currentUid: string = '';
  eventQuery: string = '';

  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private router: Router = inject(Router);
  private ngZone: NgZone = inject(NgZone);

  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
    private endpoints: ApiEndpointsService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.ngZone.run(() => {
        if (user) {
          this.isLogged = true;
          this.currentUid = user.uid;
          const userDocRef = doc(this.firestore, 'usuarios', user.uid);
          docData(userDocRef, { idField: 'id' }).subscribe((data: any) => {
            this.ngZone.run(() => {
              this.userName = data?.name || user.displayName || 'Usuario';
              this.profileImage = data?.fotoPerfil || 'DefaultPF.png';
            });
          });
        } else {
          this.isLogged = false;
        }
      });
    });
  }

  openCreateEventDialog(): void {
    const dialogRef = this.dialog.open(CreateEventDialogComponent, {
     
      data: { currentUserName: this.userName }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.createEvent(result);
    });
  }

  createEvent(eventData: any): void {
    this.http.post(this.endpoints.eventosEndpoint, eventData, { responseType: 'text' }).subscribe({
      next: (response: string) => {
        this.snackBar.open('Evento creado con éxito.', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
      },
      error: (err) => {
        this.snackBar.open('Error creando evento.', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  openEditProfileDialog(): void {
    if (!this.isLogged) {
      this.goToLogin();
      return;
    }

    const dialogRef = this.dialog.open(EditProfileComponent, {
      
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Perfil actualizado.', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-info']
        });
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    signOut(this.auth)
      .then(() => {
        this.ngZone.run(() => {
          this.isLogged = false;
          this.userName = 'Usuario';
          this.profileImage = 'DefaultPF.png';
          this.router.navigate(['/login']);
          this.snackBar.open('Sesión cerrada.', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-info']
          });
        });
      })
      .catch((error) => {
        this.snackBar.open('Error al cerrar sesión.', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error']
        });
      });
  }

  searchEvent(): void {
    const eventId = this.eventQuery.trim();
    if (!eventId) {
      this.snackBar.open('Por favor ingresa un ID de evento.', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-warning']
      });
      return;
    }

    const searchUrl = this.endpoints.getEventoByIdEndpoint(eventId);
    this.http.get<any>(searchUrl).subscribe({
      next: (data) => {
        if (data) {
          if (!data.id) data.id = eventId;
          this.dialog.open(JoinEventDialogComponent, {
            width: '400px',
            data: { event: data, currentUser: this.userName }
          });
        } else {
          this.snackBar.open('Evento no encontrado.', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-warning']
          });
        }
      },
      error: (err) => {
        this.snackBar.open('Error al buscar el evento.', 'Cerrar', {
          duration: 1500,
          panelClass: ['snackbar-error']
        });
      }
    });
  }
}

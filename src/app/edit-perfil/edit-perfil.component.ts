import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Auth, onAuthStateChanged, updatePassword } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  docData,
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from '@angular/fire/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-edit-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule],
  templateUrl: './edit-perfil.component.html',
  styleUrls: ['./edit-perfil.component.css']
})
export class EditProfileComponent implements OnInit {
  // Datos del perfil
  uid: string = '';
  name: string = '';
  email: string = '';
  info: string = '';

  // Copias para restaurar si se cancela la edición
  originalName: string = '';
  originalEmail: string = '';
  originalInfo: string = '';

  // Foto de perfil
  profileImage: string = 'DefaultPF.png';

  // Campos de contraseña
  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  // Flag para modo edición global
  isEditing: boolean = false;

  // Flag para detectar si el usuario inició sesión con Google
  isGoogleUser: boolean = false;

  // Flag para mostrar/ocultar la sección de cambio de contraseña
  showPasswordFields: boolean = false;

  // Inyección de Firebase y Snackbar
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private snackBar: MatSnackBar = inject(MatSnackBar);

  constructor(private dialogRef: MatDialogRef<EditProfileComponent>) {}

  ngOnInit(): void {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.uid = user.uid;
        this.email = user.email || '';
        // Determinar si el usuario inició sesión con Google
        this.isGoogleUser = (user.providerData || []).some(p => p.providerId === 'google.com');
        const userDocRef = doc(this.firestore, "usuarios", this.uid);
        docData(userDocRef, { idField: 'id' }).subscribe((data: any) => {
          this.name = data?.name || '';
          this.info = data?.opcInfo || '';
          this.profileImage = data?.fotoPerfil || this.profileImage;
          // Guardar los valores originales para poder revertirlos si se cancela
          this.originalName = this.name;
          this.originalEmail = this.email;
          this.originalInfo = this.info;
        });
      }
    });
  }

  /**
   * Activa el modo edición global.
   */
  toggleEdit(): void {
    if (!this.isEditing) {
      // Guarda los valores actuales para poder restaurarlos
      this.originalName = this.name;
      this.originalEmail = this.email;
      this.originalInfo = this.info;
      this.isEditing = true;
    }
  }

  /**
   * Guarda los cambios realizados en los campos editables y actualiza Firestore.
   * Además, si el nombre ha cambiado, actualiza la colección "eventos" donde aparece.
   */
  async saveProfile(): Promise<void> {
    const profileData: any = {
      name: this.name,
      opcInfo: this.info
    };
    const userDocRef = doc(this.firestore, "usuarios", this.uid);
    try {
      await setDoc(userDocRef, profileData, { merge: true });
      // Si el nombre ha cambiado, actualizamos los eventos:
      if (this.name !== this.originalName) {
        await this.updateEventsName(this.originalName, this.name);
      }
      this.snackBar.open('Perfil actualizado correctamente.', 'Cerrar', { duration: 3000 });
      this.isEditing = false;
    } catch (err: any) {
      this.snackBar.open('Error actualizando el perfil: ' + err.message, 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Actualiza el campo "creadorId" y, si existe, el campo "citasReservadas"
   * en todos los documentos de la colección "eventos" que tengan el nombre antiguo,
   * reemplazándolo por el nuevo.
   */
  private async updateEventsName(oldName: string, newName: string): Promise<void> {
    try {
      const eventosRef = collection(this.firestore, "eventos");
      const q = query(eventosRef, where("creadorId", "==", oldName));
      const querySnapshot = await getDocs(q);
      console.log(`Se encontraron ${querySnapshot.size} eventos con creadorId === ${oldName}`);
      
      if (!querySnapshot.empty) {
        const batch = writeBatch(this.firestore);
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const updateData: any = { creadorId: newName };
          // Se revisa citasReservadas usando acceso con corchetes
          if (data['citasReservadas'] && typeof data['citasReservadas'] === "object") {
            const updatedReservations: any = { ...data['citasReservadas'] };
            let updated = false;
            Object.keys(updatedReservations).forEach(key => {
              if (updatedReservations[key] === oldName) {
                updatedReservations[key] = newName;
                updated = true;
              }
            });
            if (updated) {
              updateData['citasReservadas'] = updatedReservations;
            }
          }
          console.log(`Actualizando evento ${docSnap.id} con datos:`, updateData);
          batch.update(docSnap.ref, updateData);
        });
        await batch.commit();
        console.log("Eventos actualizados exitosamente.");
      } else {
        console.log("No se encontraron eventos para actualizar.");
      }
    } catch (error) {
      console.error("Error actualizando eventos: ", error);
    }
  }

  /**
   * Cancela la edición y restaura los valores originales.
   */
  cancelEdit(): void {
    this.name = this.originalName;
    this.email = this.originalEmail;
    this.info = this.originalInfo;
    this.isEditing = false;
  }

  /**
   * Sube una nueva imagen de perfil y actualiza Firestore.
   */
  uploadFile(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;
    const filePath = `fotosPerfil/${this.uid}_${file.name}`;
    const storageRef = ref(getStorage(), filePath);
    
    uploadBytes(storageRef, file)
      .then(() => getDownloadURL(storageRef))
      .then((downloadUrl) => {
        const userDocRef = doc(this.firestore, "usuarios", this.uid);
        return setDoc(userDocRef, { fotoPerfil: downloadUrl }, { merge: true })
          .then(() => {
            this.profileImage = downloadUrl;
            this.snackBar.open('Foto de perfil actualizada correctamente.', 'Cerrar', { duration: 3000 });
          });
      })
      .catch((error) => {
        console.error('Error subiendo la imagen:', error);
        this.snackBar.open('Error subiendo la imagen.', 'Cerrar', { duration: 3000 });
      });
  }

  /**
   * Alterna la visualización de cambio de contraseña.
   */
  togglePasswordFields(): void {
    this.showPasswordFields = !this.showPasswordFields;
  }

  /**
   * Valida que la nueva contraseña tenga al menos 8 caracteres y que coincida con la confirmación.
   */
  isPasswordValid(): boolean {
    return this.newPassword.length >= 8 && this.newPassword === this.confirmPassword;
  }

  /**
   * Actualiza la contraseña del usuario.
   */
  savePassword(): void {
    if (this.isPasswordValid()) {
      const user = this.auth.currentUser;
      if (user) {
        updatePassword(user, this.newPassword)
          .then(() => {
            this.snackBar.open('Contraseña actualizada correctamente.', 'Cerrar', { duration: 3000 });
            this.oldPassword = '';
            this.newPassword = '';
            this.confirmPassword = '';
            this.showPasswordFields = false;
          })
          .catch(err => {
            this.snackBar.open('Error actualizando la contraseña: ' + err.message, 'Cerrar', { duration: 3000 });
          });
      } else {
        this.snackBar.open('No se encontró el usuario.', 'Cerrar', { duration: 3000 });
      }
    } else {
      this.snackBar.open('Verifica que la nueva contraseña cumpla los requisitos y que coincidan los valores.', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Cierra el diálogo.
   */
  onCancel(): void {
    this.dialogRef.close();
  }
}

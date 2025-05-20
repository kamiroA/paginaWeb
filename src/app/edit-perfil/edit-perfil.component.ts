// src/app/edit-perfil/edit-perfil.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Auth, onAuthStateChanged, updatePassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc, docData } from '@angular/fire/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'app-edit-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-perfil.component.html',
  styleUrls: ['./edit-perfil.component.css']
})
export class EditProfileComponent implements OnInit {
  // Datos del perfil
  uid: string = '';
  name: string = '';
  email: string = '';
  info: string = '';
  
  // Propiedad para la foto de perfil, con valor por defecto
  profileImage: string = 'DefaultPF.png';

  // Campos de contraseña
  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  // Flags para edición
  editName: boolean = false;
  editEmail: boolean = false;
  editInfo: boolean = false;
  showPasswordFields: boolean = false;

  // Inyectar la nueva API de Firebase
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);

  constructor(private dialogRef: MatDialogRef<EditProfileComponent>) {}

  ngOnInit(): void {
    // Escucha el estado de autenticación para cargar los datos del usuario
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.uid = user.uid;
        this.email = user.email || '';
        const userDocRef = doc(this.firestore, "usuarios", this.uid);
        docData(userDocRef, { idField: 'id' }).subscribe((data: any) => {
          this.name = data?.name || '';
          this.info = data?.opcInfo || '';
          this.profileImage = data?.fotoPerfil || this.profileImage;
        });
      }
    });
  }

  // Método para manejar la subida de imagen
  uploadFile(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;
    
    const filePath = `fotosPerfil/${this.uid}_${file.name}`;
    const storageRef = ref(getStorage(), filePath);
    
    uploadBytes(storageRef, file)
      .then((snapshot) => {
        return getDownloadURL(storageRef);
      })
      .then((downloadUrl) => {
        const userDocRef = doc(this.firestore, "usuarios", this.uid);
        return setDoc(userDocRef, { fotoPerfil: downloadUrl }, { merge: true })
          .then(() => {
            this.profileImage = downloadUrl;
            alert('Foto de perfil actualizada correctamente.');
          });
      })
      .catch((error) => {
        console.error('Error subiendo la imagen:', error);
        alert('Error subiendo la imagen.');
      });
  }

  toggleEdit(field: string): void {
    switch (field) {
      case 'name':
        if (this.editName) {
          this.saveProfile();
        }
        this.editName = !this.editName;
        break;
      case 'email':
        this.editEmail = !this.editEmail;
        break;
      case 'info':
        if (this.editInfo) {
          this.saveProfile();
        }
        this.editInfo = !this.editInfo;
        break;
    }
  }

  togglePasswordFields(): void {
    this.showPasswordFields = !this.showPasswordFields;
  }

  isPasswordValid(): boolean {
    return this.newPassword.length >= 8 && this.newPassword === this.confirmPassword;
  }

  savePassword(): void {
    if (this.isPasswordValid()) {
      const user = this.auth.currentUser;
      if (user) {
        updatePassword(user, this.newPassword)
          .then(() => {
            alert('Contraseña actualizada correctamente.');
            this.oldPassword = '';
            this.newPassword = '';
            this.confirmPassword = '';
            this.showPasswordFields = false;
          })
          .catch(err => {
            alert('Error actualizando la contraseña: ' + err.message);
          });
      } else {
        alert('No se encontró el usuario.');
      }
    } else {
      alert('Verifica que la nueva contraseña cumpla los requisitos y que coincidan los valores.');
    }
  }

  saveProfile(): void {
    const profileData = {
      name: this.name,
      opcInfo: this.info
    };

    const userDocRef = doc(this.firestore, "usuarios", this.uid);
    setDoc(userDocRef, profileData, { merge: true })
      .then(() => {
        alert('Perfil actualizado correctamente.');
      })
      .catch(err => {
        alert('Error actualizando el perfil: ' + err.message);
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

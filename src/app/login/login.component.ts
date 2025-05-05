import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;  // Declaramos la variable sin inicializar
  errorMessage: string = '';
  infoMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private afAuth: AngularFireAuth, 
    private router: Router, 
    private fb: FormBuilder
  ) {
    // Inicializamos el formulario en el constructor
    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  // Getters para los controles del formulario
  get emailControl() {
    return this.loginForm.get('email');
  }
  get passwordControl() {
    return this.loginForm.get('password');
  }

  // Método de login con email y password
  async login(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.errorMessage = '';
    this.infoMessage = '';
    this.isLoading = true;
    try {
      await this.afAuth.signInWithEmailAndPassword(this.emailControl?.value, this.passwordControl?.value);
      this.router.navigate(['/menu']);
    } catch (error: any) {
      this.errorMessage = 'Credenciales incorrectas.';
      console.warn('Error en login:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Método para login con Google
  async loginWithGoogle(): Promise<void> {
    this.errorMessage = '';
    this.infoMessage = '';
    this.isLoading = true;
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await this.afAuth.signInWithPopup(provider);
      this.router.navigate(['/menu']);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.warn('Popup de Google cerrado por el usuario.');
      } else {
        this.errorMessage = 'Error en login con Google.';
      }
      console.warn('Error en loginWithGoogle:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Método para enviar correo de restablecimiento de contraseña
  async resetPassword(): Promise<void> {
    this.errorMessage = '';
    this.infoMessage = '';
    const email = this.emailControl?.value;
    if (!email) {
      this.errorMessage = 'Ingresa tu email para restablecer.';
      return;
    }
    this.isLoading = true;
    try {
      await this.afAuth.sendPasswordResetEmail(email);
      this.infoMessage = 'Correo enviado.';
    } catch (error: any) {
      this.errorMessage = 'No se pudo enviar el correo.';
      console.warn('Error en resetPassword:', error);
    } finally {
      this.isLoading = false;
    }
  }
}

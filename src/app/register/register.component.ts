import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private afAuth: AngularFireAuth, private router: Router) {}

  register(): void {
    this.afAuth.createUserWithEmailAndPassword(this.email, this.password)
      .then(userCredential => {
        this.router.navigate(['/menu']);  // Redirige al menú principal tras el registro
      })
      .catch(error => {
        this.errorMessage = error.message;
        console.error("Error en registro:", error);
      });
  }
}
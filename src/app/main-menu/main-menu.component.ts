import { Component } from '@angular/core';
import { NavbarComponent } from "../navbar/navbar.component";
import { CalendarioComponent } from '../calendario/calendario.component';


@Component({
  selector: 'app-main-menu',
  standalone: true,
  imports: [NavbarComponent, CalendarioComponent],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.css'
})
export class MainMenuComponent {

}

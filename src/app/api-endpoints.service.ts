// src/app/services/api-endpoints.service.ts

import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiEndpointsService {
  private baseUrl = environment.apiBaseUrl;

  constructor() {}

  /**
   * Endpoint para gestionar eventos.
   * Ejemplo para crear o obtener la lista de eventos:
   * GET o POST: http://localhost:8080/eventos
   */
  get eventosEndpoint(): string {
    return `${this.baseUrl}/eventos`;
  }

  /**
   * Endpoint para obtener un evento por ID.
   * @param id El ID del evento.
   * Ejemplo: GET http://localhost:8080/eventos/{id}
   */
  getEventoByIdEndpoint(id: string): string {
    return `${this.baseUrl}/eventos/${id}`;
  }

  /**
   * Endpoint para actualizar un evento completamente.
   * @param id El ID del evento a actualizar.
   * Ejemplo: PUT http://localhost:8080/eventos/{id}
   */
  get updateEventoEndpoint(): (id: string) => string {
    return (id: string) => `${this.baseUrl}/eventos/${id}`;
  }

  /**
   * Endpoint para eliminar un evento.
   * @param id El ID del evento a eliminar.
   * Ejemplo: DELETE http://localhost:8080/eventos/{id}
   */
  get deleteEventoEndpoint(): (id: string) => string {
    return (id: string) => `${this.baseUrl}/eventos/${id}`;
  }

  /**
   * Endpoint para actualizar las reservas de un evento.
   * @param id El ID del evento en el que se actualizan las citas.
   * Ejemplo: PATCH http://localhost:8080/eventos/{id}/reservar
   */
  get reservarCitaEndpoint(): (id: string) => string {
    return (id: string) => `${this.baseUrl}/eventos/${id}/reservar`;
  }

  /**
   * Endpoint para obtener eventos por fecha.
   * @param fecha La fecha en formato esperado (por ejemplo, ISO o en el formato que maneje tu API).
   * Ejemplo: GET http://localhost:8080/eventos/fecha/{fecha}
   */
  get getEventosByFechaEndpoint(): (fecha: string) => string {
    return (fecha: string) => `${this.baseUrl}/eventos/fecha/${fecha}`;
  }
}

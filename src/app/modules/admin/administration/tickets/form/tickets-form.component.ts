import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TicketsService } from '../tickets.service';
import { Observable } from 'rxjs';
import { startWith, map } from 'rxjs/operators';

@Component({
  selector: 'app-tickets-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './tickets-form.component.html',
  styleUrls: ['./tickets-form.component.css']
})
export class TicketsFormComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  isSubmitting = false;

  tipos: any[] = [];
  prioridades: any[] = [];
  responsables: any[] = [];
  usuariosParaCC: any[] = [];

  filteredResponsables: Observable<any[]> = new Observable();
  filteredUsuariosCC: Observable<any[]> = new Observable();

  responsableControl = new FormControl();
  usuariosCCControl = new FormControl();

  usuariosSeleccionadosCC: any[] = [];
  archivosSeleccionados: File[] = [];

  constructor(
    private fb: FormBuilder,
    private ticketsService: TicketsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      ticketTipoId: [null, Validators.required],
      ticketPrioridadId: [null, Validators.required],
      idResponsable: [5]
    });
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.setupAutocomplete();
  }

  cargarCatalogos(): void {
    this.isLoading = true;
    this.ticketsService.obtenerCatalogos().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.tipos = res.data.tipos;
          this.prioridades = res.data.prioridades;
        }
        this.isLoading = false;
      }
    });

    this.ticketsService.obtenerUsuariosAsignacion().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.responsables = res.data;
          this.usuariosParaCC = res.data;
        }
      }
    });
  }

  setupAutocomplete(): void {
    this.filteredResponsables = this.responsableControl.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' ? value : value?.nombreUsuario || ''),
      map(nombre => this._filterResponsables(nombre))
    );

    this.filteredUsuariosCC = this.usuariosCCControl.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' ? value : value?.nombreUsuario || ''),
      map(nombre => this._filterUsuariosCC(nombre))
    );
  }

  private _filterResponsables(nombre: string): any[] {
    const filterValue = nombre.toLowerCase();
    return this.responsables.filter(r => r.nombreUsuario.toLowerCase().includes(filterValue));
  }

  private _filterUsuariosCC(nombre: string): any[] {
    const filterValue = nombre.toLowerCase();
    return this.usuariosParaCC.filter(u =>
      u.nombreUsuario.toLowerCase().includes(filterValue) &&
      !this.usuariosSeleccionadosCC.find(sel => sel.usuarioId === u.usuarioId)
    );
  }

  agregarUsuarioCC(usuario: any): void {
    if (usuario && !this.usuariosSeleccionadosCC.find(u => u.usuarioId === usuario.usuarioId)) {
      this.usuariosSeleccionadosCC.push(usuario);
      this.usuariosCCControl.setValue('');
    }
  }

  eliminarUsuarioCC(usuarioId: number): void {
    this.usuariosSeleccionadosCC = this.usuariosSeleccionadosCC.filter(u => u.usuarioId !== usuarioId);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        this.archivosSeleccionados.push(input.files[i]);
      }
    }
  }

  eliminarArchivo(index: number): void {
    this.archivosSeleccionados.splice(index, 1);
  }

  obtenerNombreResponsable(): string {
    const id = this.form.get('idResponsable')?.value;
    const responsable = this.responsables.find(r => r.usuarioId === id);
    return responsable ? responsable.nombreUsuario : 'Usuario desconocido';
  }

  guardar(): void {
    if (!this.form.valid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 4000 });
      return;
    }

    this.isSubmitting = true;
    const dto = {
      ...this.form.value,
      idUsuariosCC: this.usuariosSeleccionadosCC.map(u => u.usuarioId)
    };

    this.ticketsService.crear(dto).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.snackBar.open('Ticket creado', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/administration/tickets']);
        } else {
          this.snackBar.open('Error al crear ticket', 'Cerrar', { duration: 4000 });
        }
        this.isSubmitting = false;
      },
      error: () => {
        this.snackBar.open('Error al crear ticket', 'Cerrar', { duration: 4000 });
        this.isSubmitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/administration/tickets']);
  }
}

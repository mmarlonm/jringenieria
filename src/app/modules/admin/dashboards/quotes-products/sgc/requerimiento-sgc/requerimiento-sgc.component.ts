import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, takeUntil } from 'rxjs/operators';
import { QuotesService } from '../../quotes-products.service';
import { RequerimientoResumen } from '../../quotes-products.types';

@Component({
  selector: 'app-requerimiento-sgc',
  templateUrl: './requerimiento-sgc.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
  ],
})
export class RequerimientoSgcComponent implements OnInit, OnDestroy {
  @Input() requerimiento: RequerimientoResumen | null = null;
  @Input() soloLectura: boolean = false;
  @Output() requerimientoChange = new EventEmitter<RequerimientoResumen | null>();

  busquedaControl = new FormControl('');
  opciones: RequerimientoResumen[] = [];
  buscando: boolean = false;
  errorBusqueda: boolean = false;
  ultimaBusqueda: string = '';

  private _destroy$ = new Subject<void>();

  constructor(private quotesService: QuotesService) {}

  ngOnInit(): void {
    this.busquedaControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((term) => {
          const q = (typeof term === 'string' ? term : '').trim();
          this.ultimaBusqueda = q;
          if (!q) {
            this.opciones = [];
            this.errorBusqueda = false;
            return of([]);
          }
          this.buscando = true;
          this.errorBusqueda = false;
          return this.quotesService.requerimientosDisponibles(q).pipe(
            catchError(() => {
              this.errorBusqueda = true;
              this.buscando = false;
              return of([]);
            })
          );
        }),
        takeUntil(this._destroy$)
      )
      .subscribe((res) => {
        this.buscando = false;
        this.opciones = res || [];
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  reintentarBusqueda(): void {
    if (!this.ultimaBusqueda) return;
    this.buscando = true;
    this.errorBusqueda = false;
    this.quotesService.requerimientosDisponibles(this.ultimaBusqueda).subscribe({
      next: (res) => {
        this.buscando = false;
        this.errorBusqueda = false;
        this.opciones = res || [];
      },
      error: () => {
        this.buscando = false;
        this.errorBusqueda = true;
      },
    });
  }

  seleccionar(req: RequerimientoResumen): void {
    this.requerimiento = req;
    this.requerimientoChange.emit(req);
    this.busquedaControl.setValue('', { emitEvent: false });
    this.opciones = [];
  }

  quitarVinculo(): void {
    this.requerimiento = null;
    this.requerimientoChange.emit(null);
  }

  displayFn(req: RequerimientoResumen): string {
    return req ? `${req.folio} - ${req.empresa || ''}` : '';
  }
}

import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormArray,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, Subject } from 'rxjs';
import { debounceTime, switchMap, catchError, takeUntil, shareReplay } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { QuotesService } from '../../quotes-products.service';
import {
  CatalogosSgc,
  ExistenciaMaterial,
  PartidaSgc,
  TotalesSgc
} from '../../quotes-products.types';
import { AddProductDialogComponent } from '../../add-product-dialog/add-product-dialog.component';
import { importeLinea, totalesSgc } from '../cotizacion-sgc.utils';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { LectorPdfMateriales } from 'app/shared/materiales/lector-pdf-materiales';
import { ImportarMaterialesDialogComponent } from 'app/modules/admin/administration/solicitudes-compra/form/importar-materiales-dialog/importar-materiales-dialog.component';
import { ContpaqiMaterialDto } from 'app/modules/admin/administration/solicitudes-compra/models/solicitud-compra.types';

@Component({
  selector: 'app-partidas-sgc',
  templateUrl: './partidas-sgc.component.html',
  styleUrls: ['./partidas-sgc.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
  ],
})
export class PartidasSgcComponent implements OnInit, OnDestroy {
  @Input() partidas!: FormArray;
  @Input() tipo: string = 'CS';
  @Input() moneda: string = 'MXN';
  @Input() catalogos: CatalogosSgc | null = null;
  @Input() heredadas: boolean = false;

  filteredProducts$: Observable<ExistenciaMaterial[]>[] = [];
  entradasManuales: { [index: number]: string | null } = {};
  errorBusqueda: { [index: number]: boolean } = {};
  unidadesDisponibles: string[] = ['PZA', 'CAJA', 'METRO', 'KILO', 'SERVICIO', 'LOTE'];
  folioContpaqi: string = '';

  private _destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private quotesService: QuotesService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private elRef: ElementRef,
    private chatNotificationService: ChatNotificationService
  ) {}

  ngOnInit(): void {
    // Si ya vienen partidas iniciales, configurar su búsqueda
    for (let i = 0; i < this.partidas.length; i++) {
      this.setupProductSearch(i);
      const unidad = this.partidas.at(i).get('unidad')?.value;
      if (unidad) {
        this.asegurarUnidad(unidad);
      }
    }
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  addPartida(data?: Partial<PartidaSgc>): FormGroup {
    const partidaNum = this.partidas.length + 1;
    const group = this.fb.group({
      partida: [partidaNum],
      tipoConcepto: [data?.tipoConcepto || 'Material'],
      materialServicio: [data?.materialServicio || '', Validators.required],
      descripcion: [data?.descripcion || null],
      codigoProducto: [data?.codigoProducto || null],
      productoId: [data?.productoId || null],
      unidad: [data?.unidad || 'PZA', Validators.required],
      cantidad: [data?.cantidad ?? 1, [Validators.required, Validators.min(0.0001)]],
      precioUnitario: [data?.precioUnitario ?? 0, [Validators.required, Validators.min(0)]],
      descuento: [data?.descuento ?? 0, [Validators.min(0)]],
      costoUnitario: [data?.costoUnitario ?? null],
      tiempoEntregaDias: [data?.tiempoEntregaDias ?? null],
      notas: [data?.notas || null],
      heredada: [data?.heredada || false],
    });

    const index = this.partidas.length;
    this.partidas.push(group);
    this.setupProductSearch(index);

    if (data?.unidad) {
      this.asegurarUnidad(data.unidad);
    }

    return group;
  }

  eliminarPartida(index: number): void {
    Swal.fire({
      title: '¿Eliminar partida?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.partidas.removeAt(index);
        this.filteredProducts$.splice(index, 1);
        delete this.entradasManuales[index];
        delete this.errorBusqueda[index];

        // Renumerar partidas 1..N
        for (let i = 0; i < this.partidas.length; i++) {
          this.partidas.at(i).get('partida')?.setValue(i + 1, { emitEvent: false });
        }

        this.cdr.markForCheck();
      }
    });
  }

  setupProductSearch(index: number): void {
    const control = this.partidas.at(index)?.get('materialServicio');
    if (!control) return;

    this.filteredProducts$[index] = control.valueChanges.pipe(
      debounceTime(500),
      takeUntil(this._destroy$),
      switchMap((value) => {
        if (typeof value === 'string' && value.trim().length >= 2) {
          const query = value.trim();
          this.errorBusqueda[index] = false;
          return this.quotesService.buscarExistencia(query).pipe(
            catchError(() => {
              this.errorBusqueda[index] = true;
              return of([] as ExistenciaMaterial[]);
            })
          );
        }
        this.entradasManuales[index] = null;
        return of([] as ExistenciaMaterial[]);
      }),
      // El pipe async de la plantilla y la suscripcion de abajo comparten UNA sola consulta a CONTPAQi
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.filteredProducts$[index].subscribe((results) => {
      const currentVal = control.value;
      if (
        typeof currentVal === 'string' &&
        currentVal.trim().length >= 2 &&
        results.length === 0 &&
        !this.errorBusqueda[index]
      ) {
        this.entradasManuales[index] = currentVal.trim();
      } else {
        this.entradasManuales[index] = null;
      }
    });
  }

  onProductoSeleccionado(product: ExistenciaMaterial, index: number): void {
    const group = this.partidas.at(index);
    if (!group) return;

    group.patchValue({
      materialServicio: product.nombreProducto,
      codigoProducto: product.codigoProducto,
      descripcion: `${product.codigoProducto} - ${product.nombreProducto}`,
      unidad: product.unidadMedida,
    });

    this.asegurarUnidad(product.unidadMedida);

    // Mover foco a cantidad
    setTimeout(() => {
      const rows = this.elRef.nativeElement.querySelectorAll('tbody tr');
      if (rows && rows[index]) {
        const cantInput = rows[index].querySelector('input[formControlName="cantidad"]') as HTMLInputElement;
        if (cantInput) {
          cantInput.focus();
          cantInput.select();
        }
      }
    });
  }

  onPegarMateriales(event: ClipboardEvent, startIndex: number, field: string): void {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const pastedText = clipboardData.getData('text');
    if (!pastedText) return;

    const lines = pastedText.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length <= 1) return;

    event.preventDefault();

    lines.forEach((line, i) => {
      const currentIndex = startIndex + i;
      if (currentIndex >= this.partidas.length) {
        this.addPartida();
      }
      this.partidas.at(currentIndex).get(field)?.setValue(line.trim());
    });
  }

  abrirCatalogoConPrecio(): void {
    const dialogRef = this.dialog.open(AddProductDialogComponent, {
      width: '80vw',
      maxWidth: '80vw',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((producto) => {
      if (producto) {
        this.addPartida({
          materialServicio: producto.nombreProducto,
          codigoProducto: producto.codigoProducto,
          unidad: producto.unidadMedida || 'PZA',
          productoId: producto.productoId,
          cantidad: producto.cantidad || 1,
          precioUnitario: producto.precioUnitario || 0,
          descuento: producto.descuento || 0,
          tiempoEntregaDias: null,
          notas: null,
          costoUnitario: null,
          tipoConcepto: 'Material',
        });
      }
    });
  }

  importarPorFolio(): void {
    const folio = this.folioContpaqi?.trim();
    if (!folio) {
      this.chatNotificationService.showWarning('Atención', 'Ingresa un folio de CONTPAQi para importar');
      return;
    }

    this.quotesService.importarPorFolio(folio).subscribe({
      next: (materiales) => {
        if (!materiales || materiales.length === 0) {
          this.chatNotificationService.showWarning(
            'Sin resultados',
            'No se encontraron materiales para el folio ingresado'
          );
          return;
        }
        this.abrirDialogoImportacion(materiales, folio);
      },
      error: (err) => {
        const msg = err?.error?.mensaje ?? (typeof err?.error === 'string' ? err.error : 'Error al consultar CONTPAQi');
        this.chatNotificationService.showError('Error', msg);
      },
    });
  }

  onPdfFileSelected(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;

    LectorPdfMateriales.leer(file)
      .then((materiales) => {
        if (!materiales || materiales.length === 0) {
          this.chatNotificationService.showWarning(
            'Atención',
            'No se detectaron tablas de materiales legibles en el PDF'
          );
          return;
        }
        this.abrirDialogoImportacion(materiales, 'PDF Importado');
      })
      .catch((err) => {
        this.chatNotificationService.showError('Error', err?.message || 'Error al procesar el archivo PDF');
      })
      .finally(() => {
        if (event?.target) {
          event.target.value = '';
        }
      });
  }

  abrirDialogoImportacion(materiales: ContpaqiMaterialDto[], folio: string): void {
    const dialogRef = this.dialog.open(ImportarMaterialesDialogComponent, {
      data: { materiales, folio },
      width: '1000px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((materialesSeleccionados: ContpaqiMaterialDto[]) => {
      if (materialesSeleccionados && materialesSeleccionados.length > 0) {
        this.procesarMaterialesImportados(materialesSeleccionados);
      }
    });
  }

  procesarMaterialesImportados(materiales: ContpaqiMaterialDto[]): void {
    if (this.partidas.length > 0) {
      Swal.fire({
        title: 'Importar Materiales',
        text: '¿Deseas sobrescribir los materiales actuales o agregarlos al final?',
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Agregar al final',
        denyButtonText: 'Sobrescribir',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (result.isConfirmed) {
          this.insertarMateriales(materiales, false);
        } else if (result.isDenied) {
          this.insertarMateriales(materiales, true);
        }
      });
    } else {
      this.insertarMateriales(materiales, true);
    }
  }

  insertarMateriales(materiales: ContpaqiMaterialDto[], sobrescribir: boolean): void {
    if (sobrescribir) {
      while (this.partidas.length) {
        this.partidas.removeAt(0);
      }
      this.filteredProducts$ = [];
      this.entradasManuales = {};
      this.errorBusqueda = {};
    }

    let huboRecortes = false;

    materiales.forEach((m) => {
      let materialServicio = (m.materialServicio || '').trim();
      let descripcion = (m.descripcion || '').trim();

      if (materialServicio.length > 200) {
        materialServicio = materialServicio.substring(0, 200);
        huboRecortes = true;
      }
      if (descripcion.length > 1000) {
        descripcion = descripcion.substring(0, 1000);
        huboRecortes = true;
      }

      const unidadNorm = LectorPdfMateriales.normalizeUnidad(m.unidad) || m.unidad || 'PZA';

      this.addPartida({
        materialServicio,
        descripcion,
        codigoProducto: m.codigoProducto || null,
        unidad: unidadNorm,
        cantidad: m.cantidad || 1,
        precioUnitario: m.costoUnitario || 0,
        tipoConcepto: 'Material',
        descuento: 0,
        costoUnitario: null,
        tiempoEntregaDias: null,
        notas: null,
      });
    });

    this.chatNotificationService.showSuccess('Éxito', `${materiales.length} materiales importados correctamente`);

    if (huboRecortes) {
      this.chatNotificationService.showWarning(
        'Aviso',
        'Algunos textos largos fueron recortados para cumplir con los límites del sistema.'
      );
    }

    this.cdr.markForCheck();
  }

  asegurarUnidad(unidad: string): void {
    if (!unidad) return;
    const norm = unidad.trim().toUpperCase();
    if (!this.unidadesDisponibles.includes(norm)) {
      this.unidadesDisponibles.push(norm);
    }
  }

  calcularImporteLinea(index: number): number {
    const group = this.partidas.at(index);
    if (!group) return 0;
    const cant = group.get('cantidad')?.value || 0;
    const precio = group.get('precioUnitario')?.value || 0;
    const desc = group.get('descuento')?.value || 0;
    return importeLinea(cant, precio, desc);
  }

  get totales(): TotalesSgc {
    const rawList = this.partidas.controls.map((c) => ({
      cantidad: c.get('cantidad')?.value || 0,
      precioUnitario: c.get('precioUnitario')?.value || 0,
      descuento: c.get('descuento')?.value || 0,
      costoUnitario: c.get('costoUnitario')?.value ?? null,
    }));
    return totalesSgc(rawList);
  }
}

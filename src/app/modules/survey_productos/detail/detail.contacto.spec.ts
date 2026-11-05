import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import Swal from 'sweetalert2';
import { FormularioProductoDto } from 'app/modules/admin/dashboards/surveys-products/surveys.service';
import { SurveyProductosService } from '../survey-productos.service';
import { DetailComponent } from './detail.component';

describe('DetailComponent — extracción de contacto en formulario dinámico', () => {
  let fixture: ComponentFixture<DetailComponent>;
  let componente: DetailComponent;
  let servicio: jasmine.SpyObj<SurveyProductosService>;

  beforeEach(() => {
    servicio = jasmine.createSpyObj<SurveyProductosService>('SurveyProductosService', [
      'obtenerFormularioPorSlug',
      'responderFormularioDinamico'
    ]);

    const formularioMock: FormularioProductoDto = {
      id: 2,
      slug: 'satisfaccion-cliente',
      titulo: 'Encuesta Formulario 2',
      descripcion: '',
      camposConfigJson: JSON.stringify([
        { id: 'nombre', tipo: 'section', etiqueta: 'Datos de contacto', orden: 1, paso: 1 },
        { id: 'campo_mw2y0stm', tipo: 'input', etiqueta: 'Nombre completo', requerido: true, orden: 2, paso: 1 },
        { id: 'empresa', tipo: 'input', etiqueta: 'Empresa u Organización', requerido: false, orden: 3, paso: 1 },
        { id: 'email', tipo: 'email', etiqueta: 'Correo Electrónico', requerido: true, orden: 4, paso: 1 },
        { id: 'telefono', tipo: 'tel', etiqueta: 'Teléfono', requerido: false, orden: 5, paso: 1 },
        { id: 'cargo', tipo: 'input', etiqueta: 'Puesto o Cargo', requerido: false, orden: 6, paso: 1 }
      ]),
      disenoConfigJson: JSON.stringify({
        modoPasos: false,
        pasos: [{ numero: 1, titulo: 'General', descripcion: '' }]
      }),
      tipo: 'producto',
      activo: true,
      fechaCreacion: '2026-11-05T00:00:00Z',
      totalRespuestas: 0
    };

    servicio.obtenerFormularioPorSlug.and.returnValue(of({ code: 200, message: '', data: formularioMock }));
    servicio.responderFormularioDinamico.and.returnValue(of({ code: 200, message: 'OK', data: { id: 1 } } as any));
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));

    TestBed.configureTestingModule({
      imports: [DetailComponent, NoopAnimationsModule],
      providers: [
        { provide: SurveyProductosService, useValue: servicio },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'satisfaccion-cliente' }) } } }
      ]
    });

    fixture = TestBed.createComponent(DetailComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('enviarDinamico_manda_el_nombre_del_campo_Nombre_completo', () => {
    componente.respuestasDinamicas['campo_mw2y0stm'] = 'Ana Pérez';
    componente.respuestasDinamicas['empresa'] = 'CFE';
    componente.respuestasDinamicas['email'] = 'ana.perez@cfe.gob.mx';
    componente.respuestasDinamicas['telefono'] = '5512345678';
    componente.respuestasDinamicas['cargo'] = 'Supervisora';

    componente.enviarDinamico();

    expect(servicio.responderFormularioDinamico).toHaveBeenCalledTimes(1);
    const [, payload] = servicio.responderFormularioDinamico.calls.mostRecent().args;
    expect(payload.nombreCliente).toBe('Ana Pérez');
    expect(payload.empresaCliente).toBe('CFE');
    expect(payload.emailCliente).toBe('ana.perez@cfe.gob.mx');
    expect(payload.telefonoCliente).toBe('5512345678');
    expect(payload.cargoCliente).toBe('Supervisora');
  });
});


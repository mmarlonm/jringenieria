import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { QuotePdfDialogComponent } from './quote-pdf-dialog.component';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

describe('QuotePdfDialogComponent', () => {
  let fixture: ComponentFixture<QuotePdfDialogComponent>;
  let component: QuotePdfDialogComponent;

  const mockFullData = {
    cotizacion: {
      cotizacionProductosId: 101,
      folio: 'COT-2026-0101',
      createdDate: new Date('2026-11-14T10:00:00Z'),
      nombreCliente: 'Empresa Cliente SA',
      nombreEmpresa: 'Razón Social Cliente SA',
      direccionCompleta: 'Av. Industria 123',
      correo: 'cliente@empresa.com',
      telefono: '555-123-4567',
    },
    sgc: {
      tipo: 'CT',
      moneda: 'MXN',
      tipoCambio: null,
      vigenciaDias: 30,
      formaPago: 'Transferencia electrónica',
      condicionesPago: '50% anticipo, 50% contra entrega',
      penalizacionCancelacion: '10% del valor total',
      puntoEntrega: 'Planta Querétaro',
      condicionesEntrega: 'FOB destino',
      cuentaDeposito: 'BBVA Cuenta 0123456789 CLABE 012180001234567890',
      exclusiones: 'No incluye maniobras de descarga ni obra civil',
      observacionesRelevantes: 'Garantía de 1 año en sitio',
      contactoNombre: 'Ing. Carlos Mendoza',
      contactoCorreo: 'cmendoza@empresa.com',
      contactoTelefono: '442-987-6543',
      anexosTecnicos: 'Anexo A: Diagrama unifilar',
      alcanceTecnico: 'Instalación y puesta en marcha de subestación',
      recursosRequeridos: 'Grúa de 10 tons, equipo de prueba hipot',
      personalInvolucrado: '2 ingenieros especialistas, 4 técnicos',
      tiemposEstimados: '3 semanas a partir del anticipo',
      supuestosOperativos: 'Libranza programada en fin de semana',
      condicionesEjecucion: 'Turno diurno sin interrupción eléctrica',
      riesgosLimitaciones: 'Disponibilidad de transformador en almacén',
      entregables: ['Planos ejecutivos', 'Protocolo de pruebas'],
      costosIndirectos: 5000,
      margenAutorizadoPorcentaje: 25,
    },
    partidas: [
      {
        partida: 1,
        materialServicio: 'Transformador 500 kVA',
        descripcion: 'Transformador trifásico tipo pedestal 13.2 kV / 440 V',
        unidad: 'PZA',
        cantidad: 1,
        precioUnitario: 250000,
        descuento: 10000,
        costoUnitario: 180000,
        tiempoEntregaDias: 15,
      },
    ],
    totales: {
      subtotal: 240000,
      iva: 38400,
      total: 278400,
      costoDirecto: 180000,
      utilidad: 55000,
      margenPorcentaje: 22.92,
      margenBajo: true,
      partidasSinCosto: 0,
    },
  };

  async function createComponent(dialogData: any) {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, QuotePdfDialogComponent],
      providers: [{ provide: MAT_DIALOG_DATA, useValue: dialogData }],
    }).compileComponents();

    fixture = TestBed.createComponent(QuotePdfDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('El_PDF_muestra_folio_cliente_partidas_totales_y_condiciones', async () => {
    await createComponent(mockFullData);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('COTIZACIÓN');
    expect(compiled.textContent).toContain('COT-2026-0101');
    expect(compiled.textContent).toContain('Empresa Cliente SA');
    expect(compiled.textContent).toContain('Ing. Carlos Mendoza');
    expect(compiled.textContent).toContain('Transformador 500 kVA');
    expect(compiled.textContent).toContain('50% anticipo, 50% contra entrega');
    expect(compiled.textContent).toContain('Planta Querétaro');
    expect(compiled.textContent).toContain('BBVA Cuenta 0123456789');
  });

  it('El_PDF_de_CT_incluye_el_alcance_y_los_entregables', async () => {
    await createComponent(mockFullData);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Instalación y puesta en marcha de subestación');
    expect(compiled.textContent).toContain('Planos ejecutivos');
    expect(compiled.textContent).toContain('Protocolo de pruebas');
  });

  it('El_PDF_de_CS_no_incluye_la_seccion_de_alcance', async () => {
    const csData = {
      ...mockFullData,
      sgc: {
        ...mockFullData.sgc,
        tipo: 'CS',
        alcanceTecnico: 'Texto secreto de alcance',
      },
    };
    await createComponent(csData);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.seccion-alcance')).toBeNull();
    expect(compiled.textContent).not.toContain('Texto secreto de alcance');
  });

  it('El_PDF_nunca_muestra_costos_ni_margen', async () => {
    await createComponent(mockFullData);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).not.toContain('180,000');
    expect(compiled.textContent).not.toContain('180000');
    expect(compiled.textContent).not.toContain('Costo directo');
    expect(compiled.textContent).not.toContain('Utilidad');
    expect(compiled.textContent).not.toContain('Margen');
    expect(compiled.textContent).not.toContain('22.92%');
  });

  it('El_PDF_no_muestra_Forma_de_pago_aunque_el_dato_exista', async () => {
    await createComponent({
      ...mockFullData,
      sgc: {
        ...mockFullData.sgc,
        formaPago: 'Transferencia electrónica 30 días'
      }
    });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Forma de pago:');
    expect(compiled.textContent).not.toContain('Transferencia electrónica 30 días');
  });

  it('El_PDF_en_USD_muestra_el_tipo_de_cambio', async () => {
    const usdData = {
      ...mockFullData,
      sgc: {
        ...mockFullData.sgc,
        moneda: 'USD',
        tipoCambio: 19.85,
      },
    };
    await createComponent(usdData);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('USD');
    expect(compiled.textContent).toContain('19.85');
  });

  it('El_PDF_ya_no_trae_el_texto_fijo_de_15_dias', async () => {
    await createComponent(mockFullData);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).not.toContain('realizar el pago dentro de los siguientes 15 días');
  });

  it('El_PDF_escapa_lo_que_viene_del_API', async () => {
    const xssData = {
      ...mockFullData,
      cotizacion: {
        ...mockFullData.cotizacion,
        nombreCliente: '<b id="xss-client">Cliente Malicioso</b>',
      },
    };
    await createComponent(xssData);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#xss-client')).toBeNull();
    expect(compiled.textContent).toContain('<b id="xss-client">Cliente Malicioso</b>');
  });

  it('El_PDF_de_una_cotizacion_heredada_usa_sus_partidas', async () => {
    const legacyData = {
      cotizacionProductosId: 55,
      nombreCliente: 'Cliente Tradicional',
      createdDate: new Date('2026-10-01'),
      subtotal: 500,
      iva: 80,
      total: 580,
      detalles: [
        {
          producto: { nombreProducto: 'Foco incandescente' },
          cantidad: 10,
          precioUnitario: 50,
          descuento: 0,
        },
      ],
    };
    await createComponent(legacyData);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('#55');
    expect(compiled.textContent).toContain('Cliente Tradicional');
    expect(compiled.textContent).toContain('Foco incandescente');
    expect(compiled.querySelector('.seccion-alcance')).toBeNull();
  });

  it('El_PDF_de_un_borrador_lleva_la_franja_BORRADOR', async () => {
    const borradorData = {
      ...mockFullData,
      cotizacion: { ...mockFullData.cotizacion, etapa: 'Borrador' },
      sgc: { ...mockFullData.sgc, etapa: 'Borrador', version: 1 },
    };
    await createComponent(borradorData);
    const compiled = fixture.nativeElement as HTMLElement;

    const franja = compiled.querySelector('.franja-borrador');
    expect(franja).toBeTruthy();
    expect(franja?.textContent).toContain('BORRADOR — no válida como cotización emitida');
  });

  it('El_PDF_de_una_cotizacion_emitida_no_lleva_la_franja_y_muestra_su_version', async () => {
    const emitidaData = {
      ...mockFullData,
      cotizacion: { ...mockFullData.cotizacion, etapa: 'Emitida', version: 2 },
      sgc: { ...mockFullData.sgc, etapa: 'Emitida', version: 2 },
    };
    await createComponent(emitidaData);
    const compiled = fixture.nativeElement as HTMLElement;

    const franja = compiled.querySelector('.franja-borrador');
    expect(franja).toBeNull();
    expect(compiled.textContent).toContain('COT-2026-0101 v2');
  });

  it('El_PDF_de_una_version_lee_la_instantanea_real_del_API', async () => {
    // Forma EXACTA de GET api/CotizacionProductos/{id}/sgc/versiones/{n}
    const detalleDelApi = {
      version: 2,
      estado: 'Vigente',
      claseCambio: 'Menor',
      cambioResumen: 'Ajuste de precio por volumen',
      fechaEmision: '2026-11-20T14:30:00Z',
      emitidaPorUsuarioId: 3,
      emitidaPorNombre: 'Ana',
      medioEnvio: 'Correo',
      clienteReceptor: 'Receptor Oficial',
      total: 278400,
      moneda: 'MXN',
      instantanea: {
        folio: 'COT-2026-0005',
        version: 2,
        cabecera: { ...mockFullData.cotizacion, folio: undefined, createdDate: undefined },
        sgc: mockFullData.sgc,
        partidas: mockFullData.partidas,
        totales: mockFullData.totales,
      },
    };
    await createComponent({ instantanea: detalleDelApi, version: 2 });
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.franja-borrador')).toBeNull();
    expect(compiled.textContent).toContain('COT-2026-0005 v2');
    expect(compiled.textContent).toContain('Empresa Cliente SA');
    expect(compiled.textContent).toContain('Transformador 500 kVA');
    expect(compiled.textContent).toContain('278,400.00');
    expect(compiled.textContent).toContain('Planta Querétaro');
    expect(compiled.querySelector('.seccion-alcance')).toBeTruthy();
    const fechaEl = compiled.querySelector('.fecha-documento');
    expect(fechaEl?.textContent).toContain('2026');
  });

  it('La_franja_BORRADOR_solo_sale_en_Borrador_EnRevision_y_Aprobada', async () => {
    const etapas: [string, boolean][] = [
      ['Borrador', true], ['EnRevision', true], ['Aprobada', true],
      ['Emitida', false], ['EnSeguimiento', false], ['Ganada', false],
      ['Perdida', false], ['Cancelada', false], ['Vencida', false], ['CerradaSinRespuesta', false],
    ];
    for (const [etapa, debeLlevarla] of etapas) {
      TestBed.resetTestingModule();
      await createComponent({ ...mockFullData, sgc: { ...mockFullData.sgc, etapa, version: 1 } });
      const franja = (fixture.nativeElement as HTMLElement).querySelector('.franja-borrador');
      expect(!!franja).withContext(etapa).toBe(debeLlevarla);
    }
  });
});

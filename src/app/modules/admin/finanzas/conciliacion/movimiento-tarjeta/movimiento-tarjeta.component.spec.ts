import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MatCheckbox } from '@angular/material/checkbox';
import { ClaseSugerida, MovimientoConciliacion, Vinculo } from '../../finanzas.types';
import { MovimientoTarjetaComponent } from './movimiento-tarjeta.component';

describe('MovimientoTarjetaComponent', () => {
    let fixture: ComponentFixture<MovimientoTarjetaComponent>;
    let componente: MovimientoTarjetaComponent;

    const vinculoSugerido: Vinculo = {
        conciliacionId: 101,
        cfdiId: 501,
        uuid: '12345678-abcd-ef01-2345-67890abcdef0',
        serie: 'A',
        folio: '100',
        contraparte: 'Cliente Ficticio SA de CV',
        total: 1000,
        saldo: 1000,
        moneda: 'MXN',
        regla: 'SALDO_EXACTO',
        confianza: 'Alta',
        estado: 'Sugerida',
        importeAplicado: 1000
    };

    const vinculoConfirmado: Vinculo = {
        conciliacionId: 102,
        cfdiId: 502,
        uuid: '87654321-abcd-ef01-2345-67890abcdef0',
        serie: null,
        folio: '200',
        contraparte: 'Otro Cliente Ficticio SA de CV',
        total: 500,
        saldo: 0,
        moneda: 'MXN',
        regla: 'MANUAL',
        confianza: null,
        estado: 'Confirmada',
        importeAplicado: 500
    };

    const movimientoBase: MovimientoConciliacion = {
        movimientoId: 10,
        cuentaId: 1,
        fecha: '2026-01-15',
        descripcion: 'Abono de cliente por transferencia',
        importe: 1500,
        saldo: 25000,
        tipoOperacion: 'Transferencia recibida',
        clase: null,
        estado: 'ConSugerencia',
        pendiente: 1000,
        sugerencias: [vinculoSugerido],
        confirmadas: [vinculoConfirmado]
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MovimientoTarjetaComponent],
            providers: [provideNoopAnimations()]
        });
        fixture = TestBed.createComponent(MovimientoTarjetaComponent);
        componente = fixture.componentInstance;
    });

    function setInputs(props: Partial<MovimientoTarjetaComponent>): void {
        fixture.componentRef.setInput('movimiento', props.movimiento ?? movimientoBase);
        fixture.componentRef.setInput('moneda', props.moneda ?? 'MXN');
        if (props.puedeEscribir !== undefined) fixture.componentRef.setInput('puedeEscribir', props.puedeEscribir);
        if (props.ocupados !== undefined) fixture.componentRef.setInput('ocupados', props.ocupados);
        if (props.ocupado !== undefined) fixture.componentRef.setInput('ocupado', props.ocupado);
        if (props.claseSugerida !== undefined) fixture.componentRef.setInput('claseSugerida', props.claseSugerida);
        if (props.seleccionado !== undefined) fixture.componentRef.setInput('seleccionado', props.seleccionado);
        fixture.detectChanges();
    }

    const botonConTexto = (texto: string): HTMLButtonElement | undefined =>
        Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((b) => b.textContent?.includes(texto));

    it('Muestra_fecha_descripcion_importe_con_color_estado_y_pendiente', () => {
        setInputs({ movimiento: movimientoBase });

        const texto = fixture.nativeElement.textContent;
        expect(texto).toContain('15/01/2026');
        expect(texto).toContain('Abono de cliente por transferencia');
        expect(texto).toContain('Transferencia recibida');
        expect(texto).toContain('Con sugerencia');
        expect(texto).toContain('Pendiente:');

        const elImporte = fixture.nativeElement.querySelector('.text-emerald-600');
        expect(elImporte).toBeTruthy();
        expect(elImporte.textContent).toContain('$1,500.00');
    });

    it('Una_sugerencia_muestra_referencia_contraparte_regla_confianza_e_importe_aplicado', () => {
        setInputs({ movimiento: movimientoBase });

        const texto = fixture.nativeElement.textContent;
        expect(texto).toContain('A-100');
        expect(texto).toContain('Cliente Ficticio SA de CV');
        expect(texto).toContain('Importe exacto');
        expect(texto).toContain('Aplica $1,000.00');

        const chipConfianza = fixture.nativeElement.querySelector('.bg-emerald-100');
        expect(chipConfianza).toBeTruthy();
        expect(chipConfianza.textContent).toContain('Alta');
    });

    it('Confirmar_y_Rechazar_emiten_el_id_del_vinculo', () => {
        setInputs({ movimiento: movimientoBase, puedeEscribir: true });

        const spyConfirmar = spyOn(componente.confirmar, 'emit');
        const spyRechazar = spyOn(componente.rechazar, 'emit');

        const btnConfirmar = botonConTexto('Confirmar');
        const btnRechazar = botonConTexto('Rechazar');

        expect(btnConfirmar).toBeTruthy();
        expect(btnRechazar).toBeTruthy();

        btnConfirmar!.click();
        expect(spyConfirmar).toHaveBeenCalledOnceWith(101);

        btnRechazar!.click();
        expect(spyRechazar).toHaveBeenCalledOnceWith(101);
    });

    it('Deshacer_emite_el_id_de_una_confirmada', () => {
        setInputs({ movimiento: movimientoBase, puedeEscribir: true });

        const spyDeshacer = spyOn(componente.deshacer, 'emit');
        const btnDeshacer = botonConTexto('Deshacer');

        expect(btnDeshacer).toBeTruthy();
        btnDeshacer!.click();
        expect(spyDeshacer).toHaveBeenCalledOnceWith(102);
    });

    it('Sin_puedeEscribir_no_hay_botones_ni_casilla', () => {
        setInputs({ movimiento: movimientoBase, puedeEscribir: false });

        const botones = fixture.nativeElement.querySelectorAll('button');
        expect(botones.length).toBe(0);

        const casilla = fixture.debugElement.query(By.directive(MatCheckbox));
        expect(casilla).toBeNull();
    });

    it('Los_botones_de_un_vinculo_ocupado_estan_deshabilitados', () => {
        setInputs({ movimiento: movimientoBase, puedeEscribir: true, ocupados: new Set([101]) });

        const btnConfirmar = botonConTexto('Confirmar');
        const btnRechazar = botonConTexto('Rechazar');
        const btnDeshacer = botonConTexto('Deshacer');

        expect(btnConfirmar?.disabled).toBeTrue();
        expect(btnRechazar?.disabled).toBeTrue();
        expect(btnDeshacer?.disabled).toBeFalse();
    });

    it('Movimiento_con_clase_muestra_la_clase_y_Quitar_clase_emite', () => {
        const movConClase: MovimientoConciliacion = { ...movimientoBase, clase: 'Nomina', sugerencias: [], confirmadas: [] };
        setInputs({ movimiento: movConClase, puedeEscribir: true, ocupado: false });

        expect(fixture.nativeElement.textContent).toContain('Nómina');
        const btnQuitar = botonConTexto('Quitar clase');
        expect(btnQuitar).toBeTruthy();
        expect(btnQuitar?.disabled).toBeFalse();

        const spyQuitar = spyOn(componente.quitarClase, 'emit');
        btnQuitar!.click();
        expect(spyQuitar).toHaveBeenCalledTimes(1);

        // Deshabilitado si ocupado
        setInputs({ movimiento: movConClase, puedeEscribir: true, ocupado: true });
        expect(botonConTexto('Quitar clase')?.disabled).toBeTrue();
    });

    it('Clase_sugerida_muestra_motivo_y_Aceptar_emite', () => {
        const sugerencia: ClaseSugerida = {
            movimientoId: 10,
            clase: 'Comision',
            motivo: 'Cobro de comisión bancaria'
        };
        setInputs({ movimiento: { ...movimientoBase, clase: null }, claseSugerida: sugerencia, puedeEscribir: true, ocupado: false });

        const texto = fixture.nativeElement.textContent;
        expect(texto).toContain('Sugerida: Comisión — Cobro de comisión bancaria');

        const btnAceptar = botonConTexto('Aceptar');
        expect(btnAceptar).toBeTruthy();
        expect(btnAceptar?.disabled).toBeFalse();

        const spyAceptar = spyOn(componente.aceptarClase, 'emit');
        btnAceptar!.click();
        expect(spyAceptar).toHaveBeenCalledTimes(1);

        // Deshabilitado si ocupado
        setInputs({ movimiento: { ...movimientoBase, clase: null }, claseSugerida: sugerencia, puedeEscribir: true, ocupado: true });
        expect(botonConTexto('Aceptar')?.disabled).toBeTrue();
    });

    it('Aplicar_a_mano_solo_si_no_hay_clase_y_queda_pendiente', () => {
        // Puede escribir, sin clase y pendiente 1000
        setInputs({ movimiento: { ...movimientoBase, clase: null, pendiente: 1000 }, puedeEscribir: true });
        const btnManual = botonConTexto('Aplicar a mano');
        expect(btnManual).toBeTruthy();

        const spyManual = spyOn(componente.aplicarManual, 'emit');
        btnManual!.click();
        expect(spyManual).toHaveBeenCalledTimes(1);

        // Con clase: no hay botón
        setInputs({ movimiento: { ...movimientoBase, clase: 'TransferenciaPropia', pendiente: 1000 }, puedeEscribir: true });
        expect(botonConTexto('Aplicar a mano')).toBeFalsy();

        // Pendiente 0: no hay botón
        setInputs({ movimiento: { ...movimientoBase, clase: null, pendiente: 0 }, puedeEscribir: true });
        expect(botonConTexto('Aplicar a mano')).toBeFalsy();
    });

    it('La_casilla_emite_seleccion_true_y_false', () => {
        setInputs({ movimiento: movimientoBase, puedeEscribir: true, seleccionado: false });

        const spySeleccion = spyOn(componente.seleccion, 'emit');
        const checkboxEl = fixture.debugElement.query(By.directive(MatCheckbox));
        expect(checkboxEl).toBeTruthy();

        const matCheckbox = checkboxEl.componentInstance as MatCheckbox;
        matCheckbox.change.emit({ checked: true } as any);
        expect(spySeleccion).toHaveBeenCalledWith(true);

        matCheckbox.change.emit({ checked: false } as any);
        expect(spySeleccion).toHaveBeenCalledWith(false);
    });

    it('Confianza_nula_no_muestra_chip', () => {
        const vinculoSinConfianza: Vinculo = { ...vinculoSugerido, confianza: null };
        setInputs({ movimiento: { ...movimientoBase, sugerencias: [vinculoSinConfianza] } });

        expect(fixture.nativeElement.querySelector('.bg-emerald-100')).toBeFalsy();
        expect(fixture.nativeElement.querySelector('.bg-amber-100')).toBeFalsy();
    });
});

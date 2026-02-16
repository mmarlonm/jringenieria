import { Directive, ElementRef, HostListener, Input, Renderer2, Output, EventEmitter } from '@angular/core';

/**
 * Directiva para redimensionar columnas de mat-table de forma nativa.
 * Evita conflictos con librerías externas y CDK Drag.
 */
@Directive({
    selector: '[appResizeColumn]',
    standalone: true
})
export class ResizeColumnDirective {
    @Input('appResizeColumn') columnId: string;
    @Output() resizeEnd = new EventEmitter<{ width: number, columnId: string }>();

    private grabbing = false;
    private startX: number;
    private startWidth: number;

    constructor(private el: ElementRef, private renderer: Renderer2) {
        // Añadimos el "mango" visualmente mediante el DOM
        const resizer = this.renderer.createElement('div');
        this.renderer.addClass(resizer, 'native-resizer');
        this.renderer.appendChild(this.el.nativeElement, resizer);

        // Escuchamos el mousedown específicamente en el resizer
        this.renderer.listen(resizer, 'mousedown', (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation(); // Vital para que el Drag&Drop de columnas no se active
            this.onMouseDown(event);
        });
    }

    private onMouseDown(event: MouseEvent) {
        this.grabbing = true;
        this.startX = event.pageX;
        this.startWidth = this.el.nativeElement.offsetWidth;

        this.renderer.addClass(document.body, 'is-resizing-column');
    }

    /**
 * Actualiza el ancho de la columna durante el movimiento del mouse.
 * @param event - MouseEvent del movimiento de la ventana.
 */
    @HostListener('window:mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
        if (!this.grabbing) return;

        const offset = event.pageX - this.startX;
        // Aumentamos el mínimo a 70px para proteger la visibilidad de los títulos
        const newWidth = Math.max(70, this.startWidth + offset);

        // IMPORTANTE: Debemos forzar el min-width y max-width para "romper" el layout de la tabla
        this.renderer.setStyle(this.el.nativeElement, 'width', `${newWidth}px`);
        this.renderer.setStyle(this.el.nativeElement, 'min-width', `${newWidth}px`);
        this.renderer.setStyle(this.el.nativeElement, 'max-width', `${newWidth}px`);
    }

    @HostListener('window:mouseup')
    onMouseUp() {
        if (!this.grabbing) return;

        this.grabbing = false;
        this.renderer.removeClass(document.body, 'is-resizing-column');

        // Emitimos el ancho final para persistencia
        this.resizeEnd.emit({
            width: this.el.nativeElement.offsetWidth,
            columnId: this.columnId
        });
    }
}
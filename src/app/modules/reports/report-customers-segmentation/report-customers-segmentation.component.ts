import {
    ChangeDetectionStrategy,
    Component,
    ViewEncapsulation,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'report-customers-segmentation',
    templateUrl: './report-customers-segmentation.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [RouterOutlet],
})
export class ReportCustomersSegmentationComponent {
    /**
     * Constructor
     */
    constructor() { }
}

import {
    ChangeDetectionStrategy,
    Component,
    ViewEncapsulation,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'report-portfolio-overdue',
    templateUrl: './report-portfolio-overdue.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [RouterOutlet],
})
export class ReportPortfolioOverdueComponent {
    /**
     * Constructor
     */
    constructor() {}
}

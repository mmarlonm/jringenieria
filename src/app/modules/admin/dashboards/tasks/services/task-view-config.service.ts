import { Injectable } from '@angular/core';

export interface TaskViewConfig {
    visibleColumns: string[];
    groupBy: string | null;
    filters: Record<string, any>;
    expandedGroups: Record<string, boolean>;
    groupColumns: Record<string, string[]>;
    columnWidths: Record<string, string>;
    groupTaskOrder: Record<string, number[]>; // NEW: Task order persistence per group
    groupColumnWidths: Record<string, Record<string, string>>; // NEW: Column width persistence per group
}

@Injectable({
    providedIn: 'root'
})
export class TaskViewConfigService {
    private readonly STORAGE_KEY = 'task-view-config';
    public readonly DEFAULT_CONFIG: TaskViewConfig = {
        visibleColumns: ['id', 'nombre', 'responsable', 'fechaInicioEstimada', 'fechaFinEstimada', 'estatus', 'empresa', 'ubicacion', 'comentarios', 'media', 'acciones'],
        groupBy: 'estatus',
        filters: {},
        expandedGroups: {},
        groupColumns: {},
        columnWidths: {
            'id': '60px',
            'nombre': '300px',
            'responsable': '100px',
            'asignados': '120px',
            'fechaInicioEstimada': '160px',
            'fechaFinEstimada': '160px',
            'estatus': '140px',
            'empresa': '150px',
            'ubicacion': '150px',
            'comentarios': '250px',
            'media': '130px',
            'acciones': '100px'
        },
        groupTaskOrder: {},
        groupColumnWidths: {}
    };

    constructor() { }

    getConfig(): TaskViewConfig {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                return { ...this.DEFAULT_CONFIG, ...JSON.parse(stored) };
            } catch (e) {
                console.error('Error parsing task view config', e);
                return { ...this.DEFAULT_CONFIG };
            }
        }
        return { ...this.DEFAULT_CONFIG };
    }

    saveConfig(config: TaskViewConfig): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    }

    updateVisibleColumns(columns: string[]): void {
        const config = this.getConfig();
        config.visibleColumns = columns;
        this.saveConfig(config);
    }

    updateGroupColumns(groupKey: string, columns: string[]): void {
        const config = this.getConfig();
        if (!config.groupColumns) config.groupColumns = {};
        config.groupColumns[groupKey] = columns;
        this.saveConfig(config);
    }

    updateFilter(key: string, value: any): void {
        const config = this.getConfig();
        config.filters[key] = value;
        this.saveConfig(config);
    }

    updateGroupBy(groupBy: string | null): void {
        const config = this.getConfig();
        config.groupBy = groupBy;
        this.saveConfig(config);
    }

    updateExpandedGroup(groupName: string, expanded: boolean): void {
        const config = this.getConfig();
        config.expandedGroups[groupName] = expanded;
        this.saveConfig(config);
    }

    updateColumnWidth(columnId: string, width: string): void {
        const config = this.getConfig();
        if (!config.columnWidths) config.columnWidths = { ...this.DEFAULT_CONFIG.columnWidths };
        config.columnWidths[columnId] = width;
        this.saveConfig(config);
    }

    updateGroupTaskOrder(groupKey: string, taskIds: number[]): void {
        const config = this.getConfig();
        if (!config.groupTaskOrder) config.groupTaskOrder = {};
        config.groupTaskOrder[groupKey] = taskIds;
        this.saveConfig(config);
    }

    resetConfig(): void {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}

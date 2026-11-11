import { RADIAL_CONNECTORS, RADIAL_NODES } from './identidad.data';

describe('Diagrama estructural futuro (identidad.data)', () => {
    const porId = new Map(RADIAL_NODES.map((n) => [n.id, n]));

    it('no repite ids y cada burbuja con padre apunta a una que existe', () => {
        expect(porId.size).toBe(RADIAL_NODES.length);
        const huerfanas = RADIAL_NODES.filter((n) => n.parentId && !porId.has(n.parentId)).map((n) => n.id);
        expect(huerfanas).toEqual([]);
    });

    it('toda burbuja sube hasta su cuadro de área sin dar vueltas', () => {
        for (const nodo of RADIAL_NODES.filter((n) => n.parentId)) {
            const visto = new Set<string>();
            let actual = nodo;
            while (actual.parentId) {
                expect(visto.has(actual.id)).toBeFalse();
                visto.add(actual.id);
                actual = porId.get(actual.parentId)!;
            }
            expect(actual.isDepartmentHub).toBeTrue();
        }
    });

    it('hay un conector por cada relación padre-hijo más los dos enlaces extra', () => {
        const conPadre = RADIAL_NODES.filter((n) => n.parentId).length;
        expect(RADIAL_CONNECTORS.length).toBe(conPadre + 2);
    });

    it('la cadena de tableros del diagrama futuro: coordinador → supervisor → diseñador → programador → tableristas → instrumentista', () => {
        const cadena = ['ing-integ-tableros', 'ing-sup-tableros', 'ing-disenador', 'ing-programador', 'ing-tableristas', 'ing-instrumentista'];
        cadena.slice(1).forEach((id, i) => expect(porId.get(id)?.parentId).toBe(cadena[i]));
        expect(porId.has('ing-sup-logistica')).toBeFalse();
    });

    it('refleja los nombres nuevos: Monserrath, Gibran en el almacén de Puebla y asistente de ingeniería', () => {
        expect(porId.get('com-aux-marketing')?.linesPerson).toEqual(['Monserrath']);
        expect(porId.get('pue-almacen')?.linesPerson).toEqual(['Gibran']);
        expect(porId.get('qro-almacen')?.linesPerson).toEqual(['Monserrath', 'Hugo']);
        expect(porId.get('ing-admin')?.role).toBe('Asistente de ingeniería');
    });
});

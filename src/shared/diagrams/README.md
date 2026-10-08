# Diagram engine

Draw IB-style diagrams in economic units (quantity across, price up), never pixels.

```tsx
<Diagram xMax={100} yMax={10} xLabel="Quantity" yLabel="Price ($)" title="Market for lattes">
  <Area points={[{ q: 0, p: 10 }, { q: 0, p: 6 }, { q: 40, p: 6 }]} pattern="hatch" tone="navy" label="CS" />
  <Curve line={demand} label="D₁" tone="navy" />
  <Curve line={supply} label="S₁" tone="red" />
  <Guide at={eq} xText="Q₁" yText="P₁" />
  <Handle at={pt} onMove={setPt} label="Price" valueText="Price $6" step={{ q: 1, p: 0.5 }} axis="p" />
</Diagram>
```

Parts: `Diagram`, `Curve` (straight `line` or `points` list), `Area` (patterns: hatch, dots, cross, plain), `Guide` (dashed lines to the axes),
`Dot`, `Arrow`, `Label`, `HLine`, `Handle` (mouse, touch and keyboard), `clipLine`.
Draw shaded areas first and handles last. Shading always uses a pattern and a text label, so meaning never depends on colour alone.

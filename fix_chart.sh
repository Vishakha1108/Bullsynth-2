#!/bin/bash
# A helper to do mass replace inside Chart.tsx to add paneId handling
sed -i 's/export default function ChartContainer()/export default function ChartContainer({ paneId }: { paneId?: string })/g' src/components/Chart.tsx
sed -i 's/<Chart \/>/<Chart paneId={paneId} \/>/g' src/components/Chart.tsx
sed -i 's/function Chart() {/function Chart({ paneId }: { paneId?: string }) {/g' src/components/Chart.tsx
sed -i 's/function OHLCVOverlay()/function OHLCVOverlay({ paneId }: { paneId?: string })/g' src/components/Chart.tsx
sed -i 's/function CompareOverlay()/function CompareOverlay({ paneId }: { paneId?: string })/g' src/components/Chart.tsx
sed -i 's/function IndicatorsOverlay()/function IndicatorsOverlay({ paneId }: { paneId?: string })/g' src/components/Chart.tsx
sed -i 's/<OHLCVOverlay \/>/<OHLCVOverlay paneId={paneId} \/>/g' src/components/Chart.tsx
sed -i 's/<CompareOverlay \/>/<CompareOverlay paneId={paneId} \/>/g' src/components/Chart.tsx
sed -i 's/<IndicatorsOverlay \/>/<IndicatorsOverlay paneId={paneId} \/>/g' src/components/Chart.tsx

import React from 'react';
import { WeatherCanvas } from '../WeatherCanvas';
import { TemperatureCurve } from '../TemperatureCurve';
import { DecisionCard } from '../DecisionCard';
import { ScoreGauge } from '../ScoreGauge';
import { ProductiveHoursMeter } from '../ProductiveHoursMeter';
import { PresetShowcase } from '../PresetShowcase';
import { PromptBar } from '../PromptBar';
import { SwarmTopology } from '../../topology/SwarmTopology';
import { NodeCard } from '../../topology/NodeCard';
import { DataPacket, TopologyConnector } from '../../topology/DataPacket';
import { NodeInspector } from '../../topology/NodeInspector';
import { TopologyNode } from '../../../types';

/**
 * Type and Contract Verification Suite for M2 and M3 Components
 */
export function TestM2M3Contract() {
  const sampleNode: TopologyNode = {
    id: 'weather',
    index: 0,
    name: 'OpenWeather Atmospheric Engine',
    service: 'OpenWeather API v3.0',
    description: 'Retrieves current weather, temperature, and wind speed.',
    status: 'completed',
    latencyMs: 142,
    iconName: 'SunMedium',
    payload: {
      temperature_c: 21.4,
      condition: 'Rain',
      humidity: 85,
    },
  };

  return (
    <div>
      {/* M2: WeatherCanvas */}
      <WeatherCanvas
        condition="Thunderstorm"
        temperature={18}
        windSpeed={22}
        humidity={90}
      />

      {/* M2: TemperatureCurve */}
      <TemperatureCurve
        currentTemp={22}
        hourlyTemps={[14, 13, 13, 12, 12, 11, 12, 14, 16, 18, 20, 21, 23, 24, 25, 24, 22, 21, 19, 18, 17, 16, 15, 14]}
        feelsLike={23}
        condition="Clear"
      />

      {/* M2: ScoreGauge with score < 40 (Crimson), 40-69 (Amber), >= 70 (Emerald) */}
      <ScoreGauge score={35} />
      <ScoreGauge score={55} />
      <ScoreGauge score={88} />

      {/* M2: ProductiveHoursMeter */}
      <ProductiveHoursMeter productiveHours={6.5} totalDayHours={8.0} />

      {/* M2: DecisionCard with 3 verdict types */}
      <DecisionCard
        decision="wfh"
        riskLevel="high"
        officeReason="Severe storm warning with active rail delays."
        aiSummary="AI advises avoiding transit."
        city="London"
        temperature={16}
        feelsLike={14}
        weatherScore={32}
        weatherCondition="Heavy Rain"
        productiveHours={6.0}
        workloadHours={7.5}
        showTemperatureCurve={true}
      />

      {/* M2: PresetShowcase */}
      <PresetShowcase
        onSelectScenario={(key, city) => console.log(key, city)}
        isRunning={false}
        activeCity="London"
      />

      {/* M2: PromptBar */}
      <PromptBar
        onSubmit={(q, c) => console.log(q, c)}
        isLoading={false}
        defaultCity="New York"
      />

      {/* M3: SwarmTopology */}
      <SwarmTopology />

      {/* M3: NodeCard across 4 states */}
      <NodeCard node={{ ...sampleNode, status: 'idle' }} />
      <NodeCard node={{ ...sampleNode, status: 'running' }} isSelected={true} />
      <NodeCard node={{ ...sampleNode, status: 'completed' }} />
      <NodeCard node={{ ...sampleNode, status: 'fallback' }} />

      {/* M3: DataPacket & TopologyConnector */}
      <DataPacket isActive={true} direction="horizontal" color="cyan" />
      <TopologyConnector isActive={true} isCompleted={false} />

      {/* M3: NodeInspector */}
      <NodeInspector node={sampleNode} onClose={() => {}} />
    </div>
  );
}

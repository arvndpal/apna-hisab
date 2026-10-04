import React from 'react';
import type { ViewProps } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { gradients } from '../../theme/tokens';

export interface GradientSurfaceProps extends ViewProps {
  variant: keyof typeof gradients;
}

/** The only place brand gradients render — hero, primary button, FAB, active tab pill, splash. */
export function GradientSurface({ variant, style, children, ...rest }: GradientSurfaceProps) {
  const g = gradients[variant];
  return (
    <LinearGradient
      colors={g.colors as unknown as string[]}
      locations={g.locations as unknown as number[]}
      start={g.start}
      end={g.end}
      style={style}
      {...rest}
    >
      {children}
    </LinearGradient>
  );
}

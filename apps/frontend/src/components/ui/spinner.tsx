import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

function Spinner({ className, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return <Loader2 className={cn('animate-spin', className)} {...props} />;
}

export { Spinner };

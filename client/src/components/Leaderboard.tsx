import React from 'react';
import { useMessages } from '@/contexts/MessageContext';
import { Card } from '@/components/ui/card';

export default function Leaderboard(){
  const { getTopHelpers } = useMessages();
  const top = getTopHelpers(10);
  if(!top.length) return null;
  return (
	<div>
	  <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Liderlik Tablosu</h3>
	  <div className="space-y-2">
		{top.map((t,i)=> (
		  <Card key={t.email} className="p-3 flex items-center justify-between">
			<div>
			  <div className="font-semibold text-foreground">{i+1}. {t.email}</div>
			  <div className="text-xs text-muted-foreground">Toplam Yardım: {t.count}</div>
			</div>
		  </Card>
		))}
	  </div>
	</div>
  );
}

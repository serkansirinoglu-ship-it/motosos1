import React from 'react';
import { Card } from '@/components/ui/card';
import { useAdmin } from '@/contexts/AdminContext';

export default function BannersRow(){
  const { banners } = useAdmin();
  const active = banners?.filter((b:any)=>b.active) || [];
  if (!active.length) return null;

  return (
	<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
	  {active.map((b:any)=> (
		<a key={b.id} href={b.link || '#'} target="_blank" rel="noreferrer">
		  <Card className="p-0 overflow-hidden h-36 flex items-center justify-center">
			{b.image ? (
			  <img src={b.image} alt={b.title} className="w-full h-full object-cover" />
			) : (
			  <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary/10 to-primary/5">
				<span className="text-lg font-semibold text-foreground px-4">{b.title}</span>
			  </div>
			)}
		  </Card>
		</a>
	  ))}
	</div>
  );
}

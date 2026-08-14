import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharedSnapshotPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createServiceClient();

  const { data: snapshot } = await supabase
    .from('shared_snapshots')
    .select('storage_path')
    .eq('token', token)
    .single();

  if (!snapshot) notFound();

  const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/screenshots/${snapshot.storage_path}`;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-7 h-7 rounded-md bg-[#ff724f] text-white flex items-center justify-center font-bold text-sm">P</div>
        <span className="font-semibold text-slate-900">Pinmarks</span>
      </div>
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Shared screenshot" className="w-full block" />
      </div>
      <a
        href={imageUrl}
        download
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
      >
        Download image
      </a>
    </div>
  );
}

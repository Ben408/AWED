import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { importExistingSite } from '@/lib/import/import-existing-site';
import { scanExistingSite } from '@/lib/import/scan-existing-site';

export async function POST(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    rootPath?: string;
    projectId?: string;
    projectName?: string;
    publicUrl?: string;
    overwrite?: boolean;
    dryRun?: boolean;
  };

  if (!body.rootPath?.trim()) {
    return NextResponse.json({ error: 'rootPath is required' }, { status: 400 });
  }

  try {
    if (body.dryRun) {
      const scan = await scanExistingSite(body.rootPath.trim());
      return NextResponse.json({ ok: true, scan });
    }

    const result = await importExistingSite({
      rootPath: body.rootPath.trim(),
      projectId: body.projectId,
      projectName: body.projectName,
      publicUrl: body.publicUrl,
      overwrite: body.overwrite,
      attach: true
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 400 }
    );
  }
}

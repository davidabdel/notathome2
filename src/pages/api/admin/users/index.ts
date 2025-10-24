import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/adminClient';

const supabaseAdmin = createAdminClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Auth header must be present
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
  }
  const token = authHeader.split(' ')[1];

  try {
    // Verify current user
    const { data: { user: currentUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !currentUser) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Ensure current user is an admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('role', 'admin');

    if (rolesError || !roles || roles.length === 0) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { email, password, roles: newRoles, congregationId, require_password_reset } = req.body as {
      email: string;
      password: string;
      roles: string[];
      congregationId?: string | null;
      require_password_reset?: boolean;
    };

    if (!email || !password || !Array.isArray(newRoles) || newRoles.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create the user with temp password
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: require_password_reset ? { require_password_reset: true } : undefined,
    });
    if (createError || !created?.user) {
      return res.status(500).json({ error: createError?.message || 'Failed to create user' });
    }

    const userId = created.user.id;

    // Assign roles
    for (const role of newRoles) {
      const roleRow: any = { user_id: userId, role, user_email: email };
      if ((role === 'congregation_admin' || role === 'user') && congregationId) {
        roleRow.congregation_id = congregationId;
      }
      const { error: roleErr } = await supabaseAdmin.from('user_roles').insert(roleRow);
      if (roleErr) {
        // Log, continue
        console.error('Error assigning role', role, roleErr);
      }
    }

    return res.status(201).json({ success: true, userId });
  } catch (e: any) {
    console.error('Error creating user (admin API):', e);
    return res.status(500).json({ error: e?.message || 'Internal server error' });
  }
}

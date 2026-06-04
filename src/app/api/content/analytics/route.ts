import { apiRequireTier } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await apiRequireTier("leadership");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);

  const [
    toolUsage,
    userActivity,
    practiceUsage,
    topMethodologies,
    topBrands,
    adoptionStats,
    recentActivity,
  ] = await Promise.all([
    // Tool usage breakdown
    db`
      SELECT tool_name, count(*)::int as calls
      FROM alexandria_request_log
      WHERE created_at >= NOW() - make_interval(days => ${days})
      GROUP BY tool_name
      ORDER BY calls DESC
    `,

    // Usage by user (top 20)
    db`
      SELECT r.user_id, u.name, u.email, count(*)::int as calls,
             max(r.created_at) as last_call
      FROM alexandria_request_log r
      LEFT JOIN users u ON u.object_id = r.user_id
      WHERE r.created_at >= NOW() - make_interval(days => ${days})
      GROUP BY r.user_id, u.name, u.email
      ORDER BY calls DESC
      LIMIT 20
    `,

    // Usage by practice
    db`
      SELECT p.name as practice_name, count(r.id)::int as calls
      FROM alexandria_request_log r
      LEFT JOIN users u ON u.object_id = r.user_id
      LEFT JOIN user_practices up ON up.user_id = u.id
      LEFT JOIN practices p ON p.id = up.practice_id
      WHERE r.created_at >= NOW() - make_interval(days => ${days})
        AND p.name IS NOT NULL
      GROUP BY p.name
      ORDER BY calls DESC
    `,

    // Most-queried methodologies (via request log matched capability)
    db`
      SELECT capability_id as slug, capability_type, count(*)::int as calls
      FROM alexandria_request_log
      WHERE created_at >= NOW() - make_interval(days => ${days})
        AND matched_capability = true
        AND capability_type = 'methodology'
      GROUP BY capability_id, capability_type
      ORDER BY calls DESC
      LIMIT 10
    `,

    // Most-queried brand packages
    db`
      SELECT capability_id as slug, count(*)::int as calls
      FROM alexandria_request_log
      WHERE created_at >= NOW() - make_interval(days => ${days})
        AND matched_capability = true
        AND capability_type = 'brand_package'
      GROUP BY capability_id
      ORDER BY calls DESC
      LIMIT 10
    `,

    // Adoption stats
    db`
      SELECT
        (SELECT count(*)::int FROM users WHERE last_mcp_seen_at >= NOW() - make_interval(days => ${days})) as active_mcp_users,
        (SELECT count(*)::int FROM users WHERE mcp_access = true) as total_mcp_enabled,
        (SELECT count(*)::int FROM users) as total_users,
        (SELECT count(*)::int FROM alexandria_request_log WHERE created_at >= NOW() - make_interval(days => ${days})) as total_calls
    `,

    // Recent activity feed (last 50 calls)
    db`
      SELECT r.tool_name, r.request_summary, r.created_at, u.name as user_name
      FROM alexandria_request_log r
      LEFT JOIN users u ON u.object_id = r.user_id
      ORDER BY r.created_at DESC
      LIMIT 50
    `,
  ]);

  return NextResponse.json({
    period_days: days,
    tool_usage: toolUsage,
    user_activity: userActivity,
    practice_usage: practiceUsage,
    top_methodologies: topMethodologies,
    top_brands: topBrands,
    adoption: adoptionStats[0] ?? { active_mcp_users: 0, total_mcp_enabled: 0, total_users: 0, total_calls: 0 },
    recent_activity: recentActivity,
  });
}

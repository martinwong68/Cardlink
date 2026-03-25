import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

const MAX_SUBTOPICS = 4;

/**
 * GET /api/business/company-settings/community-theme
 * Returns the company's community theme (board) and subtopics (sub_boards).
 */
export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  // Get the company's board (theme)
  const { data: board } = await supabase
    .from("boards")
    .select("id, name, slug, description, icon, logo_url, sort_order")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!board) {
    return NextResponse.json({ theme: null, subtopics: [] });
  }

  // Get sub_boards (subtopics) for this board
  const { data: subBoards } = await supabase
    .from("sub_boards")
    .select("id, name, slug, description, sort_order")
    .eq("board_id", board.id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    theme: {
      id: board.id,
      name: board.name,
      slug: board.slug,
      description: board.description,
      icon: board.icon,
      logo_url: board.logo_url,
    },
    subtopics: (subBoards ?? []).map((sb) => ({
      id: sb.id,
      name: sb.name,
      slug: sb.slug,
      description: sb.description,
      sort_order: sb.sort_order,
    })),
  });
}

/**
 * PUT /api/business/company-settings/community-theme
 * Creates or updates the company's community theme and subtopics.
 * Body: { name, description?, icon?, subtopics: [{ name, description? }] }
 */
export async function PUT(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;
  const body = await request.json();

  const themeName = typeof body.name === "string" ? body.name.trim() : "";
  const themeDesc = typeof body.description === "string" ? body.description.trim() : "";
  const themeIcon = typeof body.icon === "string" ? body.icon.trim() : "";

  if (!themeName) {
    return NextResponse.json({ error: "Theme name is required." }, { status: 400 });
  }

  const subtopics: Array<{ name: string; description: string }> = [];
  if (Array.isArray(body.subtopics)) {
    for (const st of body.subtopics.slice(0, MAX_SUBTOPICS)) {
      const stName = typeof st.name === "string" ? st.name.trim() : "";
      if (stName) {
        subtopics.push({
          name: stName,
          description: typeof st.description === "string" ? st.description.trim() : "",
        });
      }
    }
  }

  // Generate slug from name
  const slug = themeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || `company-${companyId.slice(0, 8)}`;

  // Check if the company already has a board
  const { data: existingBoard } = await supabase
    .from("boards")
    .select("id")
    .eq("company_id", companyId)
    .limit(1)
    .maybeSingle();

  let boardId: string;

  if (existingBoard) {
    // Update existing board
    boardId = existingBoard.id;
    const { error: updateError } = await supabase
      .from("boards")
      .update({
        name: themeName,
        slug,
        description: themeDesc || null,
        icon: themeIcon || null,
      })
      .eq("id", boardId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    // Create new board
    const { data: newBoard, error: insertError } = await supabase
      .from("boards")
      .insert({
        company_id: companyId,
        name: themeName,
        slug,
        description: themeDesc || null,
        icon: themeIcon || null,
        sort_order: 0,
        is_public: true,
      })
      .select("id")
      .single();

    if (insertError || !newBoard) {
      return NextResponse.json({ error: insertError?.message ?? "Failed to create theme." }, { status: 500 });
    }
    boardId = newBoard.id;
  }

  // Delete existing subtopics and recreate
  await supabase.from("sub_boards").delete().eq("board_id", boardId);

  if (subtopics.length > 0) {
    const subBoardRows = subtopics.map((st, idx) => {
      const stSlug = st.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        || `topic-${idx + 1}`;
      return {
        board_id: boardId,
        name: st.name,
        slug: stSlug,
        description: st.description || null,
        sort_order: idx,
      };
    });

    const { error: subError } = await supabase
      .from("sub_boards")
      .insert(subBoardRows);

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, board_id: boardId });
}

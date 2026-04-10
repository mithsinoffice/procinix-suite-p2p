import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-0ae9f757/health", (c) => {
  return c.json({ status: "ok" });
});

// ============================================
// ITEM MASTER ROUTES
// ============================================

// Get all items
app.get("/make-server-0ae9f757/items", async (c) => {
  try {
    const items = await kv.getByPrefix("item_master:");
    return c.json({ success: true, data: items });
  } catch (error) {
    console.log("Error fetching items:", error);
    return c.json({ success: false, error: "Failed to fetch items" }, 500);
  }
});

// Get single item by ID
app.get("/make-server-0ae9f757/items/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const item = await kv.get(`item_master:${id}`);
    
    if (!item) {
      return c.json({ success: false, error: "Item not found" }, 404);
    }
    
    return c.json({ success: true, data: item });
  } catch (error) {
    console.log("Error fetching item:", error);
    return c.json({ success: false, error: "Failed to fetch item" }, 500);
  }
});

// Create new item
app.post("/make-server-0ae9f757/items", async (c) => {
  try {
    const body = await c.req.json();
    const item = {
      ...body,
      id: body.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`item_master:${item.id}`, item);
    return c.json({ success: true, data: item }, 201);
  } catch (error) {
    console.log("Error creating item:", error);
    return c.json({ success: false, error: "Failed to create item" }, 500);
  }
});

// Update existing item
app.put("/make-server-0ae9f757/items/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    const existingItem = await kv.get(`item_master:${id}`);
    if (!existingItem) {
      return c.json({ success: false, error: "Item not found" }, 404);
    }
    
    const updatedItem = {
      ...existingItem,
      ...body,
      id, // Preserve original ID
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`item_master:${id}`, updatedItem);
    return c.json({ success: true, data: updatedItem });
  } catch (error) {
    console.log("Error updating item:", error);
    return c.json({ success: false, error: "Failed to update item" }, 500);
  }
});

// Delete item
app.delete("/make-server-0ae9f757/items/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existingItem = await kv.get(`item_master:${id}`);
    if (!existingItem) {
      return c.json({ success: false, error: "Item not found" }, 404);
    }
    
    // Check if item is approved (workflow rule: cannot delete approved items)
    if (existingItem.approvalStatus === 'Approved') {
      return c.json({ 
        success: false, 
        error: "Cannot delete approved items. Please deactivate instead." 
      }, 403);
    }
    
    await kv.del(`item_master:${id}`);
    return c.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    console.log("Error deleting item:", error);
    return c.json({ success: false, error: "Failed to delete item" }, 500);
  }
});

Deno.serve(app.fetch);
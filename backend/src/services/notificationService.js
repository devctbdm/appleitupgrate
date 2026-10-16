import Notification from '../models/Notification.js';
import { emitToAdmins } from '../socket.js';

// Persist a notification and push it to every connected admin client in
// real time. Fire-and-forget: callers never await this and failures are
// swallowed so they can never break the request that triggered the event.
export async function createNotification({
  category = 'system',
  title,
  description,
  link = '',
  order = null,
}) {
  try {
    const doc = new Notification({ category, title, description, link, order });
    await doc.save();

    emitToAdmins('notification:new', {
      _id: doc._id,
      category: doc.category,
      title: doc.title,
      description: doc.description,
      link: doc.link,
      read: doc.read,
      createdAt: doc.createdAt,
    });

    return doc;
  } catch (err) {
    console.error('createNotification failed:', err.message);
    return null;
  }
}

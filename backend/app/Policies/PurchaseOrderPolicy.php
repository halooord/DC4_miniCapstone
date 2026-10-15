<?php

namespace App\Policies;

use App\Models\PurchaseOrder;
use App\Models\User;

/**
 * Who may do what with a purchase order. Whether the order is in the right STATUS
 * (for example "still pending") is checked separately in the controller and answered with 409.
 */
class PurchaseOrderPolicy
{
    /** Edit: the person who requested it, or an admin. */
    public function update(User $user, PurchaseOrder $order): bool
    {
        return $user->isAdmin() || (int) $order->requested_by === (int) $user->id;
    }

    /** Delete: same rule as edit. */
    public function delete(User $user, PurchaseOrder $order): bool
    {
        return $this->update($user, $order);
    }

    public function approve(User $user, PurchaseOrder $order): bool
    {
        return $user->isAdmin();
    }

    public function reject(User $user, PurchaseOrder $order): bool
    {
        return $user->isAdmin();
    }

    /** Any logged-in user may mark an approved order as received. */
    public function receive(User $user, PurchaseOrder $order): bool
    {
        return true;
    }
}
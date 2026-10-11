<?php
// save_nota.php
require 'db.php';

header('Content-Type: application/json');

// Read JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Insert into transactions
    $stmt = $pdo->prepare("
        INSERT INTO transactions (nota_number, brand_name, address, phone, date, subtotal, ppn_rate, tax_amount, total, payment) 
        VALUES (:nota, :brand, :addr, :phone, :date, :subtotal, :ppn_rate, :tax_amount, :total, :payment)
    ");
    
    // Formatting the date to MySQL datetime format (from DD/MM/YYYY, HH:mm format we have on JS)
    // Actually, it's safer to just let PHP generate the current timestamp, or use the JS one if we parse it carefully.
    // Let's just use current MySQL timestamp for DB records, it's more reliable.
    
    // Calculations to ensure data integrity
    $subtotal = 0;
    foreach ($data['products'] as $p) {
        $subtotal += $p['price'] * $p['quantity'];
    }
    
    $tax_amount = floor($subtotal * ($data['ppnRate'] / 100));
    $total = $subtotal + $tax_amount;

    $stmt->execute([
        'nota' => $data['notaNumber'],
        'brand' => $data['brandName'],
        'addr' => $data['address'],
        'phone' => $data['phone'],
        'date' => date('Y-m-d H:i:s'), // Use server time
        'subtotal' => $subtotal,
        'ppn_rate' => $data['ppnRate'],
        'tax_amount' => $tax_amount,
        'total' => $total,
        'payment' => $data['payment']
    ]);
    
    $transaction_id = $pdo->lastInsertId();

    // 2. Insert into transaction_items
    $stmtItem = $pdo->prepare("
        INSERT INTO transaction_items (transaction_id, product_name, price, quantity, total_price) 
        VALUES (:t_id, :name, :price, :qty, :total_price)
    ");

    foreach ($data['products'] as $p) {
        $stmtItem->execute([
            't_id' => $transaction_id,
            'name' => $p['name'],
            'price' => $p['price'],
            'qty' => $p['quantity'],
            'total_price' => $p['price'] * $p['quantity']
        ]);
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'transaction_id' => $transaction_id]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>

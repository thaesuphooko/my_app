<?php
// YouTube Link Update
if(isset($_POST['save_music'])) {
    file_put_contents('settings.txt', $_POST['music_link']);
}

// ဈေးနှုန်း အတိုးအလျော့ လုပ်ခြင်း (CSV ကို ပြန်ပြင်မယ်)
if(isset($_POST['adjust_price'])) {
    $rows = array_map('str_getcsv', file('products.csv'));
    $change = (int)$_POST['amount'];
    foreach($rows as &$row) {
        $row[1] = (int)$row[1] + $change; // index 1 က ဈေးနှုန်းလို့ သတ်မှတ်ထားသည်
    }
    $fp = fopen('products.csv', 'w');
    foreach($rows as $row) fputcsv($fp, $row);
    fclose($fp);
}
?>

<form method="post">
    <h3>Setting & Price Adjustment</h3>
    <input type="text" name="music_link" placeholder="YouTube Embed Link">
    <button name="save_music">Update Music</button>
    <hr>
    <input type="number" name="amount" placeholder="Amount (e.g. 2000 or -2000)">
    <button name="adjust_price">Update All Prices</button>
</form>


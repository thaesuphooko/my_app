<iframe src="<?php echo file_get_contents('step/settings.txt'); ?>" width="560" height="315"></iframe>

<table>
    <?php
    $data = array_map('str_getcsv', file('step/products.csv'));
    foreach($data as $row) {
        echo "<tr><td>{$row[0]}</td><td>{$row[1]} MMK</td></tr>";
    }
    ?>
</table>


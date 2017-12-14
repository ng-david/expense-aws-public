<?php

function makePage($body, $title = "Project 3") {
  $page = <<<EOPAGE
<!doctype html>
<html>
  <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <title>$title</title>
  </head>

  <body>
          $body
  </body>
</html>
EOPAGE;
  return $page;
}

function makeSubmissionFields($action, $name = "", $email = "", $gpa = "", $year = "", $gender = "") {
  $is10 = ($year === "10") ? "checked" : "";
  $is11 = ($year === "11") ? "checked" : "";
  $is12 = ($year === "12") ? "checked" : "";
  $isM = ($gender === "M") ? "checked" : "";
  $isF = ($gender === "F") ? "checked" : "";

  $body = <<<FORM
    <form action="{$action}" method="post">
      <strong>Name: </strong><input required type="text" name="name" value="$name"/>
      <br><br>

      <strong>Email: </strong><input required type="email" name="email" value="$email"/>
      <br><br>

      <strong>GPA: </strong><input required type="number" step="0.01" name="gpa" value="$gpa"/>
      <br><br>

      <strong>Year:</strong>
      <input required type="radio" name="year" value="10" $is10/> 10
      <input required type="radio" name="year" value="11" $is11/> 11
      <input required type="radio" name="year" value="12" $is12/> 12
      <br><br>

      <strong>Gender:</strong>
      <input required type="radio" name="gender" value="M" $isM/> M
      <input required type="radio" name="gender" value="F" $isF/> F
      <br><br>

      <strong>Password: </strong><input required type="password" name="password"/>
      <br><br>

      <strong>Verify Password: </strong><input required type="password" name="verifyPassword"/>
      <br><br>

      <input type="submit" name="submitInfoButton" value="Submit Data"/><br><br>
    </form>
FORM;

  return $body;
}

function makeReturnButton() {
  $body = <<<RETURNBUTTON
    <form action="{$_SERVER['PHP_SELF']}" method="post">
      <input type="submit" name="returnButton" value="Return to main menu"/>
    </form>
RETURNBUTTON;

  return $body;
}


function makeEmailPassForm() {
  $body = <<<FORM
    <form action="{$_SERVER['PHP_SELF']}" method="post">
      <strong>Email associated with application: </strong><input required type="email" name="email"/>
      <br><br>
      <strong>Password associated with application: </strong><input required type="password" name="password"/>
      <br><br>
      <input type="submit" name="submitInfoButton" value="Submit Data"/><br><br>
    </form>
FORM;
  return $body;
}

function makeErrorEmailPassForm() {
  $body = "No entry exists in the database for the specified email and password<br><br>";
  $body .= makeEmailPassForm();
  return $body;
}


function sanitize_string($db_connection, $string) {
  if (get_magic_quotes_gpc()) {
    $string = stripslashes($string);
  }
  return htmlentities($db_connection->real_escape_string($string));
}

function getFromDatabase($email) {
  $dbhost = "localhost";
	$dbuser = "dbuser";
	$dbpassword = "goodbyeWorld";
	$dbdatabase = "applicationdb";
  $body = '';

  $db = new mysqli($dbhost, $dbuser, $dbpassword, $dbdatabase);

  if ($db->connect_error) {
    die($db->connect_error);
  } else {
    // Get
    $query = 'select name, gpa, year, gender from applicants where email="'.$email.'"';
    $result = $db->query($query);
    if (!$result) {
      die("Select failed with error: " . $db->error);
    } else {
      $num_rows = $result->num_rows;
      if ($num_rows === 0) {
        echo "TABLE WAS EMPTY!!!<br>";
      } else {
        for ($row_index = 0; $row_index < $num_rows; $row_index++) {
          $result->data_seek($row_index);
          $row = $result->fetch_array(MYSQLI_ASSOC);

          $name = $row['name'];
          $gpa = $row['gpa'];
          $year = $row['year'];
          $gender = $row['gender'];

          $body .=  '<strong>Name:</strong> '.$name."<br><br>";
          $body .=  '<strong>Email:</strong> '.$email."<br><br>";
          $body .=  '<strong>GPA:</strong> '.$gpa."<br><br>";
          $body .=  '<strong>Year:</strong> '.$year."<br><br>";
          $body .=  '<strong>Gender:</strong> '.$gender."<br><br>";
        }
      }
    }
  }
  $db->close();

  return $body;
}

?>

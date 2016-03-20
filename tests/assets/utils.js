function format_date(date){
    if (date) {
      return date.format('YYYY-MM-DD HH:mm:ssZ');
    }
}


function datesEqual(actual, expected, message){
    QUnit.push(QUnit.equiv(+actual, +expected), format_date(actual), format_date(expected), message);
}

(function ($) {
  "use strict";


  /*==================================================================
  [ Focus Contact2 ]*/
  $('.input100').each(function(){
      $(this).on('blur', function(){
          if($(this).val().trim() != "") {
              $(this).addClass('has-val');
          }
          else {
              $(this).removeClass('has-val');
          }
      })    
  })


  /*==================================================================
  [ Validate ]*/
  var input = $('.validate-input .input100');

  $('.validate-form').on('submit',function(event){
      event.preventDefault();
      var check = true;

      if($('.validate-input .input100')[0].value != $('.validate-input .input100')[1].value){
        check=false;
        showValidate($('.validate-input .input100')[1]);
      } 
      
      if(check==true){
        changepass();
      }
      return check;

  });



  $('.validate-form .input100').each(function(){
      $(this).focus(function(){
         hideValidate(this);
      });
  });


  function showValidate(input) {
      var thisAlert = $(input).parent();

      $(thisAlert).addClass('alert-validate');
  }

  function hideValidate(input) {
      var thisAlert = $(input).parent();

      $(thisAlert).removeClass('alert-validate');
  }

  function changepass(){
    var pass = $('#inputPassword').val();
    var user = $("#username").val();
    $.ajax({
      method: "POST",
      url: '/changepass',
      data: {
        username: user,
        newPass: pass
      }
    })
    .done(response=>{
      console.log(response);
      alert("Password Changed Successfully");
      location.href = '/login';
    })
  }

})(jQuery);


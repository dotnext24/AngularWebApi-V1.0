using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Data.Entity;

namespace SM.Store.Api.Entities
{
    public class Contact
    {
        [Key]
        public int ContactID { get; set; }
        public string ContactName { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public int PrimaryType { get; set; } // 1: Phone; 2: Email.
        public DateTime? AuditTime { get; set; }
    }
}
